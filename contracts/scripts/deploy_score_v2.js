const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ScoreV2 = await ethers.getContractFactory("ScoreV2");
  const c = await ScoreV2.deploy(deployer.address);
  const tx = c.deploymentTransaction();
  console.log("Deploy tx:", tx.hash);
  await c.waitForDeployment();

  const addr = await c.getAddress();
  console.log("ScoreV2 deployed at:", addr);
}

main().catch((e) => { console.error(e); process.exit(1); });
