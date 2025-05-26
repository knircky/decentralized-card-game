const hre = require("hardhat");

async function main() {
  const CardGame = await hre.ethers.getContractFactory("CardGame");
  const cardGame = await CardGame.deploy();
  await cardGame.waitForDeployment();

  console.log("CardGame deployed to:", await cardGame.getAddress());
  
  // Save contract address and ABI
  const fs = require("fs");
  const contractData = {
    address: await cardGame.getAddress(),
    abi: cardGame.interface.format('json')
  };
  
  fs.writeFileSync(
    "./frontend/src/abi/CardGame.json",
    JSON.stringify(contractData.abi, null, 2)
  );
  
  console.log("Contract ABI saved to frontend");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});