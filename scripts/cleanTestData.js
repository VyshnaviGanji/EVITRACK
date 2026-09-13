const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Evidence = require('../models/Evidence');
const ActivityLog = require('../models/ActivityLog');
const Case = require('../models/Case');

async function cleanTestData() {
  try {
    console.log('🧹 Cleaning all test data...\n');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evitrack');
    console.log('✅ Connected to MongoDB\n');

    // Delete evidence
    const evidenceCount = await Evidence.countDocuments();
    await Evidence.deleteMany({});
    console.log(`✅ Deleted ${evidenceCount} evidence records`);

    // Delete cases
    const caseCount = await Case.countDocuments();
    await Case.deleteMany({});
    console.log(`✅ Deleted ${caseCount} cases`);

    // Delete activity logs
    const logCount = await ActivityLog.countDocuments();
    await ActivityLog.deleteMany({});
    console.log(`✅ Deleted ${logCount} activity log entries`);

    // Delete uploaded files
    const uploadsDir = path.join(__dirname, '../uploads/evidence');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => fs.unlinkSync(path.join(uploadsDir, file)));
      console.log(`✅ Deleted ${files.length} uploaded files`);
    }

    console.log('\n✅ All test data cleared! Officer accounts are kept.');
    console.log('📋 Next steps:');
    console.log('   1. Open Ganache → Quickstart (fresh blockchain)');
    console.log('   2. npm run deploy');
    console.log('   3. npm run dev\n');

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanTestData();
