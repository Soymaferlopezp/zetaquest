const { ethers } = require("hardhat");

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function waitForCode(addr, provider, timeoutMs=180_000, intervalMs=3_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const code = await provider.getCode(addr);
      if (code && code !== "0x") return true;
    } catch {}
    await sleep(intervalMs);
  }
  throw new Error(`Timeout esperando código en ${addr}`);
}

async function main() {
  const base = process.env.BASE_IMAGE_URI;
  if (!base) throw new Error("Set BASE_IMAGE_URI en .env (https://ipfs.io/ipfs/<CID>/traveler-)");

  const [deployer] = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  const predicted = ethers.getCreateAddress({ from: deployer.address, nonce });

  console.log("Deployer:", deployer.address);
  console.log("BASE_IMAGE_URI:", base);
  console.log("Predicted NFTv2 address:", predicted);

  const Factory = await ethers.getContractFactory("ZetaQuestNFTv2");
  const contract = await Factory.deploy(base);
  const tx = contract.deploymentTransaction();
  console.log("Deploy tx hash:", tx.hash);

  await waitForCode(predicted, ethers.provider);
  console.log("ZetaQuestNFTv2 deployed at:", predicted);
}

main().catch((e) => { console.error(e); process.exit(1); });
