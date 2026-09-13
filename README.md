# Evitrack - Blockchain Evidence Management System

A blockchain-based forensic evidence management system for law enforcement that ensures digital evidence integrity through immutable hash storage.

## 🎯 Features

- **Officer Authentication**: Secure registration and login with JWT tokens
- **Evidence Upload**: Upload digital evidence files (images, videos, documents, audio)
- **SHA-256 Hashing**: Cryptographic hash generation for all evidence
- **Blockchain Storage**: Immutable hash storage on Ethereum blockchain
- **Integrity Verification**: Verify evidence hasn't been tampered with
- **Tampering Detection**: Automatic detection of modified files
- **Activity Logging**: Complete audit trail of all actions
- **Dashboard**: Statistics and recent activity overview
- **Search**: Find evidence by filename, case ID, or date range

## 💰 Cost: $0.00 (Completely Free!)

This project uses:
- **Polygon Mumbai Testnet** (real blockchain) - FREE
- **MongoDB Community Edition** - FREE
- **Node.js** - FREE
- **Test MATIC tokens** - FREE (from faucet)
- **Reading from blockchain** - FREE forever!

No credit card required. No subscriptions. No hidden costs.

### ❓ Common Questions

**Q: Is MetaMask a blockchain?**  
A: No! MetaMask is just a wallet app. The blockchain is Polygon Mumbai (a public network).

**Q: Can we fetch from real blockchain?**  
A: Yes! Reading from blockchain is completely FREE. Only writing costs gas (which is FREE on testnet).

**Q: Where is the hash stored?**  
A: ONLY on the blockchain. NOT in the database. This ensures true immutability.

📖 Read [YOUR_QUESTIONS_ANSWERED.md](YOUR_QUESTIONS_ANSWERED.md) for detailed explanations!

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ ([Download](https://nodejs.org/))
- MongoDB ([Download](https://www.mongodb.com/try/download/community))

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB (in a separate terminal)
mongod

# 3. Copy environment file
cp .env.example .env

# 4. Seed test police officers
npm run seed

# 5. Start the server (works in simulation mode)
npm run dev
```

Server runs at: http://localhost:5000

### Optional: Deploy to Real Blockchain

```bash
# 1. Generate wallet and get test tokens
npm run deploy

# 2. Get FREE test MATIC from faucet
# Visit: https://faucet.polygon.technology/

# 3. Deploy contract (after getting tokens)
npm run deploy

# 4. Update CONTRACT_ADDRESS in utils/blockchain.js

# 5. Restart server
npm run dev
```

📖 See [QUICK_START_BLOCKCHAIN.md](QUICK_START_BLOCKCHAIN.md) for detailed blockchain setup!

## 📖 Full Setup Guide

See [SETUP.md](SETUP.md) for detailed instructions including:
- Step-by-step setup
- Blockchain configuration options
- Testing instructions
- Troubleshooting guide

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## 📚 API Documentation

### Authentication

**Register Officer**
```bash
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@police.gov",
  "password": "Password123",
  "policeId": "PID001",
  "department": "Forensics"
}
```

**Login**
```bash
POST /api/auth/login
{
  "email": "john@police.gov",
  "password": "Password123"
}
```

### Evidence Management

**Upload Evidence**
```bash
POST /api/evidence/upload
Headers: Authorization: Bearer {token}
Form Data:
  - file: [evidence file]
  - caseId: "CASE001"
  - evidenceName: "Crime Scene Photo"
  - evidenceType: "image"
  - description: "Photo of crime scene"
```

**List Evidence**
```bash
GET /api/evidence
Headers: Authorization: Bearer {token}
```

**Verify Evidence**
```bash
POST /api/evidence/verify/:id
Headers: Authorization: Bearer {token}
```

**Download Evidence**
```bash
GET /api/evidence/:id/download
Headers: Authorization: Bearer {token}
```

### Dashboard

**Get Statistics**
```bash
GET /api/dashboard/stats
Headers: Authorization: Bearer {token}
```

**Search Evidence**
```bash
POST /api/evidence/search
Headers: Authorization: Bearer {token}
{
  "filename": "crime",
  "caseId": "CASE001",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

## 🏗️ Project Structure

```
evitrack/
├── contracts/              # Solidity smart contracts
├── models/                 # MongoDB models
├── routes/                 # API routes
├── middleware/             # Express middleware
├── utils/                  # Utility functions
├── scripts/                # Setup scripts
├── tests/                  # Test files
├── uploads/                # Evidence file storage
├── server.js               # Main server file
├── package.json
└── README.md
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- File type validation
- File size limits (500MB)
- Permission-based access control
- Activity logging for audit trails
- Blockchain immutability

## 🌐 Blockchain Options

### Current: Simulation Mode (Default)
- Works immediately, no setup needed
- Hashes stored in memory
- Perfect for testing the app
- Run: `npm run dev`

### Recommended: Polygon Mumbai (Real Blockchain)
- Real blockchain on the internet
- Hashes stored permanently
- Reading is FREE forever
- Writing costs gas (FREE with test tokens)
- Setup: See [QUICK_START_BLOCKCHAIN.md](QUICK_START_BLOCKCHAIN.md)

### How Verification Works:
1. Upload: Hash stored ONLY on blockchain (not in database)
2. Verify: Hash fetched FROM blockchain (FREE!)
3. Compare: Current file hash vs blockchain hash
4. Result: Verified ✅ or Tampered ❌

📖 Read [BLOCKCHAIN_FETCH_EXPLAINED.md](BLOCKCHAIN_FETCH_EXPLAINED.md) for details!

## 📝 Test Police IDs

After running `npm run seed`, use these IDs to register:

- **PID001** - John Doe - Central Station
- **PID002** - Jane Smith - North Station
- **PID003** - Mike Johnson - South Station
- **PID004** - Sarah Williams - East Station
- **PID005** - Robert Brown - West Station

## 🐛 Troubleshooting

**Ganache won't start**
```bash
ganache --port 8545
```

**MongoDB connection error**
```bash
# Check if MongoDB is running
mongosh
```

**Contract deployment fails**
- Make sure Ganache is running first
- Check truffle-config.js settings

## 📄 License

MIT License - Free to use for any purpose

## 🤝 Contributing

Contributions welcome! Please read the spec documents in `.kiro/specs/` for implementation guidelines.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for law enforcement and forensic professionals**

**Cost: $0.00 | Setup Time: 10 minutes | Blockchain: FREE**
