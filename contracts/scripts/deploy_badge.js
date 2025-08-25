const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("ZetaQuestMainnetBadge");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  console.log("ZetaQuestMainnetBadge deployed at:", await contract.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
