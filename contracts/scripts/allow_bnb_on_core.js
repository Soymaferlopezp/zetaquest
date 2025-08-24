const { ethers } = require("hardhat");

async function main() {
  const coreAddr = process.env.ZETAQUEST_CORE_ADDRESS;
  const bnbChainId = 97; // BNB Testnet
  if (!coreAddr) throw new Error("ZETAQUEST_CORE_ADDRESS no seteada en .env");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Core:", coreAddr);

  const Core = await ethers.getContractAt("ZetaQuestCore", coreAddr);
  const tx = await Core.allowDstChain(bnbChainId, true);
  console.log("allowDstChain tx:", tx.hash);
  await tx.wait();
  console.log("Allowed dst chain", bnbChainId, "✔");
}

main().catch((e)=>{ console.error(e); process.exit(1); });
