const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying EvidenceStorage contract to Local Ganache...\n");

  // Get the contract factory
  const EvidenceStorage = await hre.ethers.getContractFactory("EvidenceStorage");
  
  // Deploy the contract
  console.log("📦 Deploying contract...");
  const evidenceStorage = await EvidenceStorage.deploy();
  
  await evidenceStorage.waitForDeployment();
  
  const address = await evidenceStorage.getAddress();
  
  console.log("\n✅ Contract deployed successfully!");
  console.log("📍 Contract Address:", address);
  console.log("🌐 View on PolygonScan:", `https://amoy.polygonscan.com/address/${address}`);
  
  // Update the blockchain.js file with the new address
  const blockchainPath = path.join(__dirname, '../utils/blockchain.js');
  let blockchainCode = fs.readFileSync(blockchainPath, 'utf8');
  
  blockchainCode = blockchainCode.replace(
    /const CONTRACT_ADDRESS = '0x[a-fA-F0-9]{40}';/,
    `const CONTRACT_ADDRESS = '${address}';`
  );
  
  fs.writeFileSync(blockchainPath, blockchainCode);
  
  console.log("\n✅ Updated utils/blockchain.js with new contract address");
  console.log("\n🎉 Setup complete! Restart your server:");
  console.log("   npm run dev\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
