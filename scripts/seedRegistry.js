const mongoose = require('mongoose');
const Registry = require('../models/Registry');
require('dotenv').config();

// Test police officers for the registry
const testOfficers = [
  {
    policeId: 'PID001',
    name: 'John Doe',
    station: 'Central Station',
    department: 'Forensics',
    rank: 'Detective',
    status: 'approved'
  },
  {
    policeId: 'PID002',
    name: 'Jane Smith',
    station: 'North Station',
    department: 'Homicide',
    rank: 'Inspector',
    status: 'approved'
  },
  {
    policeId: 'PID003',
    name: 'Mike Johnson',
    station: 'South Station',
    department: 'Cybercrime',
    rank: 'Officer',
    status: 'approved'
  },
  {
    policeId: 'PID004',
    name: 'Sarah Williams',
    station: 'East Station',
    department: 'Forensics',
    rank: 'Senior Detective',
    status: 'approved'
  },
  {
    policeId: 'PID005',
    name: 'Robert Brown',
    station: 'West Station',
    department: 'Narcotics',
    rank: 'Captain',
    status: 'approved'
  }
];

async function seedRegistry() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/evitrack');
    console.log('Connected to MongoDB');

    // Clear existing registry
    await Registry.deleteMany({});
    console.log('Cleared existing registry');

    // Insert test officers
    await Registry.insertMany(testOfficers);
    console.log(`Added ${testOfficers.length} officers to registry`);

    // Display the officers
    console.log('\n✅ Registry seeded successfully!\n');
    console.log('Test Police IDs you can use for registration:');
    console.log('─────────────────────────────────────────────');
    testOfficers.forEach(officer => {
      console.log(`${officer.policeId} - ${officer.name} - ${officer.station}`);
    });
    console.log('─────────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding registry:', error);
    process.exit(1);
  }
}

seedRegistry();
