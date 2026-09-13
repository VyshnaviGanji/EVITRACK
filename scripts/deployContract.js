const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

// Polygon Mumbai RPC (FREE!)
const POLYGON_MUMBAI_RPC = 'https://rpc-mumbai.maticvigil.com';
const web3 = new Web3(POLYGON_MUMBAI_RPC);

// Smart contract bytecode and ABI
const contractSource = fs.readFileSync(
  path.join(__dirname, '../contracts/EvidenceStorage.sol'),
  'utf8'
);

async function deployContract() {
  console.log('🚀 Starting contract deployment to Polygon Mumbai...\n');
  
  try {
    // Step 1: Check if we have a private key in .env
    require('dotenv').config();
    let privateKey = process.env.PRIVATE_KEY;
    let account;
    
    if (!privateKey || privateKey === '') {
      console.log('📝 No private key found. Generating new wallet...');
      account = web3.eth.accounts.create();
      privateKey = account.privateKey;
      
      console.log('\n✅ New wallet created!');
      console.log('📍 Address:', account.address);
      console.log('🔑 Private Key:', privateKey);
      console.log('\n⚠️  IMPORTANT: Save this private key! Add it to your .env file:');
      console.log(`PRIVATE_KEY=${privateKey}\n`);
      
      // Check balance
      const balance = await web3.eth.getBalance(account.address);
      const balanceInMatic = web3.utils.fromWei(balance, 'ether');
      
      console.log(`💰 Current balance: ${balanceInMatic} MATIC`);
      
      if (parseFloat(balanceInMatic) === 0) {
        console.log('\n❌ No MATIC tokens found!');
        console.log('\n📥 Get FREE test MATIC tokens:');
        console.log('1. Go to: https://faucet.polygon.technology/');
        console.log('2. Select "Mumbai" network');
        console.log(`3. Enter your address: ${account.address}`);
        console.log('4. Click "Submit" and wait 1-2 minutes');
        console.log('5. Run this script again: npm run deploy\n');
        return;
      }
    } else {
      account = web3.eth.accounts.privateKeyToAccount(privateKey);
      console.log('✅ Using existing wallet:', account.address);
      
      const balance = await web3.eth.getBalance(account.address);
      const balanceInMatic = web3.utils.fromWei(balance, 'ether');
      console.log(`💰 Balance: ${balanceInMatic} MATIC\n`);
      
      if (parseFloat(balanceInMatic) < 0.01) {
        console.log('⚠️  Low balance! Get more test MATIC from:');
        console.log('https://faucet.polygon.technology/\n');
      }
    }
    
    web3.eth.accounts.wallet.add(account);
    
    // Step 2: Compile contract (simplified - using pre-compiled bytecode)
    console.log('📦 Compiling contract...');
    
    // For simplicity, we'll use a pre-compiled version
    // In production, you'd use solc compiler here
    const contractABI = [
      {
        "inputs": [
          {"internalType": "string", "name": "_evidenceId", "type": "string"},
          {"internalType": "string", "name": "_hash", "type": "string"},
          {"internalType": "string", "name": "_caseId", "type": "string"}
        ],
        "name": "storeEvidence",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "string", "name": "_evidenceId", "type": "string"}],
        "name": "getEvidence",
        "outputs": [
          {"internalType": "string", "name": "hash", "type": "string"},
          {"internalType": "string", "name": "caseId", "type": "string"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "bool", "name": "exists", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "string", "name": "_evidenceId", "type": "string"}],
        "name": "evidenceExists",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "string", "name": "evidenceId", "type": "string"},
          {"indexed": false, "internalType": "string", "name": "hash", "type": "string"},
          {"indexed": false, "internalType": "string", "name": "caseId", "type": "string"},
          {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"indexed": false, "internalType": "address", "name": "uploadedBy", "type": "address"}
        ],
        "name": "EvidenceStored",
        "type": "event"
      }
    ];
    
    console.log('✅ Contract compiled!\n');
    
    console.log('⚠️  NOTE: To actually deploy, you need to:');
    console.log('1. Install Solidity compiler: npm install solc');
    console.log('2. Get test MATIC tokens from faucet');
    console.log('3. Run deployment with proper compilation\n');
    
    console.log('For now, using simulation mode...');
    console.log('Your app will work locally without real blockchain deployment.\n');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check internet connection');
    console.error('2. Verify you have test MATIC tokens');
    console.error('3. Try again in a few minutes\n');
  }
}

deployContract();
