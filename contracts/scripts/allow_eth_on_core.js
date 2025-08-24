const { ethers } = require("hardhat");

async function main() {
  const coreAddr = process.env.ZETAQUEST_CORE_ADDRESS;
  const ETH_SEPOLIA = 11155111; // Sepolia
  if (!coreAddr) throw new Error("ZETAQUEST_CORE_ADDRESS no seteada en .env");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Core:", coreAddr);

  const Core = await ethers.getContractAt("ZetaQuestCore", coreAddr);
  const tx = await Core.allowDstChain(ETH_SEPOLIA, true);
  console.log("allowDstChain tx:", tx.hash);
  await tx.wait();
  console.log("Allowed dst chain", ETH_SEPOLIA, "✔");
}

main().catch((e) => { console.error(e); process.exit(1); });
