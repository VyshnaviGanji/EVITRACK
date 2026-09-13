const mongoose = require('mongoose');
const Registry = require('../models/Registry');
const Officer = require('../models/Officer');
require('dotenv').config();

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evitrack');
    console.log('✅ Connected to MongoDB\n');

    // Check Registry
    console.log('📋 REGISTRY (Pre-approved Police IDs):');
    console.log('═'.repeat(60));
    const registries = await Registry.find();
    if (registries.length === 0) {
      console.log('❌ No entries found! Run: npm run seed');
    } else {
      registries.forEach((reg, index) => {
        console.log(`${index + 1}. ${reg.policeId} - ${reg.name} - ${reg.station} (${reg.status})`);
      });
    }
    console.log(`\nTotal: ${registries.length} entries\n`);

    // Check Officers
    console.log('👮 REGISTERED OFFICERS:');
    console.log('═'.repeat(60));
    const officers = await Officer.find().select('-password');
    if (officers.length === 0) {
      console.log('❌ No officers registered yet!');
      console.log('💡 Register at: http://localhost:5000');
    } else {
      officers.forEach((officer, index) => {
        console.log(`${index + 1}. ${officer.name}`);
        console.log(`   Email: ${officer.email}`);
        console.log(`   Police ID: ${officer.policeId}`);
        console.log(`   Department: ${officer.department}`);
        console.log(`   Registered: ${officer.createdAt.toLocaleString()}`);
        if (officer.lastLogin) {
          console.log(`   Last Login: ${officer.lastLogin.toLocaleString()}`);
        }
        console.log('');
      });
    }
    console.log(`Total: ${officers.length} officers\n`);

    // Check Evidence (if any)
    const Evidence = mongoose.model('Evidence', new mongoose.Schema({}, { strict: false }));
    const evidenceCount = await Evidence.countDocuments();
    console.log('📁 EVIDENCE:');
    console.log('═'.repeat(60));
    console.log(`Total: ${evidenceCount} evidence files uploaded\n`);

    // Summary
    console.log('📊 SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`✅ Registry entries: ${registries.length}`);
    console.log(`✅ Registered officers: ${officers.length}`);
    console.log(`✅ Evidence files: ${evidenceCount}`);
    console.log('');

    if (registries.length === 0) {
      console.log('⚠️  ACTION REQUIRED: Run "npm run seed" to add Police IDs');
    }
    if (officers.length === 0) {
      console.log('💡 TIP: Register your first officer at http://localhost:5000');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
