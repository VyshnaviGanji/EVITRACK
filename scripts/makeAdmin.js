// Run: node scripts/makeAdmin.js <email>
// Example: node scripts/makeAdmin.js officer@police.gov

require('dotenv').config();
const mongoose = require('mongoose');
const Officer = require('../models/Officer');

const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/makeAdmin.js <email>');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evitrack')
  .then(async () => {
    const officer = await Officer.findOneAndUpdate(
      { email },
      { isAdmin: true },
      { new: true }
    );

    if (!officer) {
      console.log('❌ Officer not found with email:', email);
    } else {
      console.log(`✅ ${officer.name} (${officer.email}) is now an admin.`);
    }

    mongoose.disconnect();
  })
  .catch(err => {
    console.error('DB error:', err.message);
    process.exit(1);
  });
