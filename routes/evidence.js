const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Evidence = require('../models/Evidence');
const ActivityLog = require('../models/ActivityLog');
const Case = require('../models/Case');
const { authMiddleware } = require('../middleware/auth');
const { storeHashOnBlockchain, getHashFromBlockchain } = require('../utils/blockchain');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/evidence';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf|doc|docx|mp3|wav|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || /m4a|mp4|aac|x-m4a/.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Generate SHA-256 hash
function generateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Upload evidence
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { caseId, evidenceName, evidenceType, description } = req.body;

    // Check officer is assigned to this case
    const caseDoc = await Case.findOne({ caseId: caseId.toUpperCase() });
    if (!caseDoc) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Case not found. Create the case first.' });
    }
    const isAssigned = caseDoc.assignedOfficers.some(id => id.toString() === req.officer.id.toString());
    if (!isAssigned) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'You are not assigned to this case.' });
    }

    console.log(`📤 Uploading evidence: ${evidenceName}`);

    // Generate file hash
    const fileHash = await generateFileHash(req.file.path);
    console.log(`🔐 Generated hash: ${fileHash.substring(0, 16)}...`);

    // Create evidence ID (used as blockchain key)
    const evidenceId = `${caseId}-${Date.now()}`;

    // Store hash on REAL blockchain (Polygon Mumbai - FREE!)
    console.log(`🔗 Storing hash on blockchain...`);
    const blockchainResult = await storeHashOnBlockchain(fileHash, caseId, evidenceId);

    // Save evidence metadata (WITHOUT hash - hash only on blockchain!)
    const evidence = new Evidence({
      caseId,
      evidenceName,
      evidenceType,
      description,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      // NOTE: fileHash NOT stored in database!
      evidenceId: evidenceId, // Store the evidenceId for verification
      transactionId: blockchainResult.transactionHash,
      blockNumber: blockchainResult.blockNumber,
      explorerUrl: blockchainResult.explorerUrl,
      uploadedBy: req.officer.id,
      uploadedByName: req.officer.name
    });

    await evidence.save();

    // Chain of custody entry
    evidence.custodyChain.push({
      action: 'uploaded',
      officerId: req.officer.id,
      officerName: req.officer.name,
      result: 'success',
      note: `File uploaded. Blockchain tx: ${blockchainResult.transactionHash?.substring(0, 16)}...`
    });
    await evidence.save();

    // Log activity
    await ActivityLog.create({
      action: 'upload',
      officerId: req.officer.id,
      officerName: req.officer.name,
      evidenceId: evidence._id,
      evidenceName: evidence.evidenceName,
      caseId: evidence.caseId,
      result: 'success',
      details: `Uploaded ${evidence.evidenceType} to blockchain (tx: ${blockchainResult.transactionHash?.substring(0, 16)}...)`
    });
    console.log(`✅ Evidence uploaded successfully!`);

    res.status(201).json({
      message: 'Evidence uploaded successfully to blockchain',
      evidence: {
        id: evidence._id,
        caseId: evidence.caseId,
        evidenceName: evidence.evidenceName,
        transactionId: evidence.transactionId,
        blockNumber: evidence.blockNumber,
        explorerUrl: evidence.explorerUrl,
        note: 'Hash stored ONLY on blockchain, not in database'
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file if upload failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Get all evidence - only from cases officer is assigned to
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const assignedCases = await Case.find({ assignedOfficers: req.officer.id }).select('caseId');
    const caseIds = assignedCases.map(c => c.caseId);

    const evidence = await Evidence.find({ caseId: { $in: caseIds } })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json(evidence);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dashboard stats - only for this officer's assigned cases
router.get('/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    // Get cases this officer is assigned to
    const assignedCases = await Case.find({ assignedOfficers: req.officer.id }).select('caseId');
    const caseIds = assignedCases.map(c => c.caseId);

    const totalEvidence = await Evidence.countDocuments({ caseId: { $in: caseIds } });
    const verifiedEvidence = await Evidence.countDocuments({ caseId: { $in: caseIds }, verificationStatus: 'verified' });
    const tamperedEvidence = await Evidence.countDocuments({ caseId: { $in: caseIds }, verificationStatus: 'tampered' });
    const recentEvidence = await Evidence.find({ caseId: { $in: caseIds } }).sort({ createdAt: -1 }).limit(5);

    res.json({
      totalEvidence,
      verifiedEvidence,
      tamperedEvidence,
      totalCases: caseIds.length,
      recentEvidence
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single evidence
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id);
    
    if (!evidence) {
      return res.status(404).json({ message: 'Evidence not found' });
    }
    
    res.json(evidence);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify evidence integrity (fetch hash from blockchain!)
router.post('/verify/:id', authMiddleware, async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id);
    
    if (!evidence) {
      return res.status(404).json({ message: 'Evidence not found' });
    }

    console.log(`🔍 Verifying evidence: ${evidence.evidenceName}`);

    // Check if file exists
    if (!fs.existsSync(evidence.filePath)) {
      return res.status(404).json({ message: 'Evidence file not found on server' });
    }

    // Step 1: Generate hash from CURRENT file
    console.log(`🔐 Generating hash from current file...`);
    const currentHash = await generateFileHash(evidence.filePath);
    console.log(`📝 Current hash: ${currentHash.substring(0, 16)}...`);

    // Step 2: Fetch ORIGINAL hash from BLOCKCHAIN
    console.log(`🔗 Fetching original hash from blockchain...`);
    const evidenceId = evidence.evidenceId; // Use stored evidenceId
    const blockchainData = await getHashFromBlockchain(evidenceId);

    if (!blockchainData || !blockchainData.exists) {
      return res.status(404).json({ 
        message: 'Original hash not found on blockchain',
        note: 'This might be a simulation mode upload. Try re-uploading the evidence.'
      });
    }

    const originalHash = blockchainData.hash;
    console.log(`📝 Original hash from blockchain: ${originalHash.substring(0, 16)}...`);

    // Step 3: Compare hashes
    const isAuthentic = currentHash === originalHash;
    console.log(`${isAuthentic ? '✅' : '❌'} Verification result: ${isAuthentic ? 'VERIFIED' : 'TAMPERED'}`);

    // Update verification status
    evidence.verificationStatus = isAuthentic ? 'verified' : 'tampered';
    evidence.isTampered = !isAuthentic;
    evidence.lastVerified = new Date();
    evidence.verificationCount = (evidence.verificationCount || 0) + 1;
    await evidence.save();

    // Chain of custody + activity log
    evidence.custodyChain.push({
      action: 'verified',
      officerId: req.officer.id,
      officerName: req.officer.name,
      result: isAuthentic ? 'success' : 'tampered',
      note: isAuthentic ? 'Hash matched blockchain record' : 'Hash mismatch - tampering detected'
    });
    await evidence.save();

    // Log activity
    await ActivityLog.create({
      action: 'verify',
      officerId: req.officer.id,
      officerName: req.officer.name,
      evidenceId: evidence._id,
      evidenceName: evidence.evidenceName,
      caseId: evidence.caseId,
      result: isAuthentic ? 'success' : 'tampered',
      details: isAuthentic ? 'Hash matched blockchain record' : 'Hash mismatch - tampering detected'
    });

    res.json({
      isAuthentic,
      originalHash,           // From blockchain
      currentHash,            // From current file
      transactionId: evidence.transactionId,
      blockNumber: evidence.blockNumber,
      explorerUrl: evidence.explorerUrl,
      verificationCount: evidence.verificationCount,
      message: isAuthentic 
        ? '✅ Evidence verified - No tampering detected. Hash matches blockchain record.' 
        : '❌ WARNING: Evidence has been modified! Hash does NOT match blockchain record.',
      note: 'Original hash fetched from blockchain, not database'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

// Download evidence
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id);
    
    if (!evidence) {
      return res.status(404).json({ message: 'Evidence not found' });
    }

    // Check if file exists
    if (!fs.existsSync(evidence.filePath)) {
      return res.status(404).json({ message: 'Evidence file not found on server' });
    }

    // Send file
    res.download(evidence.filePath, evidence.fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ message: 'Download failed' });
      }
    });

    // Log activity + custody (fire and forget)
    ActivityLog.create({
      action: 'download',
      officerId: req.officer.id,
      officerName: req.officer.name,
      evidenceId: evidence._id,
      evidenceName: evidence.evidenceName,
      caseId: evidence.caseId,
      result: 'success',
      details: `Downloaded file: ${evidence.fileName}`
    }).catch(() => {});

    Evidence.findByIdAndUpdate(evidence._id, {
      $push: {
        custodyChain: {
          action: 'downloaded',
          officerId: req.officer.id,
          officerName: req.officer.name,
          result: 'success',
          note: `File downloaded by ${req.officer.name}`
        }
      }
    }).catch(() => {});
  } catch (error) {
    res.status(500).json({ message: 'Download failed', error: error.message });
  }
});

// Get chain of custody for a specific evidence
router.get('/:id/custody', authMiddleware, async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id).select('evidenceName caseId custodyChain');
    if (!evidence) return res.status(404).json({ message: 'Evidence not found' });
    res.json({ evidenceName: evidence.evidenceName, caseId: evidence.caseId, custodyChain: evidence.custodyChain });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
