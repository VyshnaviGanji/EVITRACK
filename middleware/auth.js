const jwt = require('jsonwebtoken');
const Officer = require('../models/Officer');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No authentication token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    const officer = await Officer.findById(decoded.id).select('-password');

    if (!officer) {
      return res.status(401).json({ message: 'Officer not found' });
    }

    req.officer = officer;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No authentication token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');

    // Admin token has isAdmin baked in (no DB record)
    if (decoded.isAdmin) {
      req.officer = { id: 'admin', name: 'Administrator', isAdmin: true };
      return next();
    }

    return res.status(403).json({ message: 'Access denied. Admins only.' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { authMiddleware, adminMiddleware };
