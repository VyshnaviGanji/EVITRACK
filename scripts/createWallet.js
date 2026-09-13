const { ethers } = require('ethers');

console.log('\n🔐 Creating new wallet for blockchain deployment...\n');

// Create a random wallet
const wallet = ethers.Wallet.createRandom();

console.log('✅ Wallet created successfully!\n');
console.log('📍 Your Wallet Address:');
console.log(wallet.address);
console.log('\n🔑 Your Private Key (KEEP THIS SECRET!):');
console.log(wallet.privateKey);

console.log('\n📋 Next Steps:');
console.log('1. Copy your wallet address above');
console.log('2. Go to: https://faucet.polygon.technology/');
console.log('3. Select "Mumbai" network');
console.log('4. Paste your wallet address');
console.log('5. Click "Submit" and wait 1-2 minutes');
console.log('6. Create a .env file and add:');
console.log(`   PRIVATE_KEY=${wallet.privateKey}`);
console.log('7. Run: npm run deploy');
console.log('\n');
