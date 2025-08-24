const { ethers } = require("hardhat");

async function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
async function waitForCode(addr, timeoutMs = 180_000, intervalMs = 3_000) {
  const provider = ethers.provider;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const code = await provider.getCode(addr);
    if (code && code !== "0x") return true;
    await sleep(intervalMs);
  }
  throw new Error(`Timeout esperando código en ${addr}`);
}

async function main() {
  const provider = ethers.provider;
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Balance (wei):", (await provider.getBalance(deployer.address)).toString());

  const base = process.env.BASE_IMAGE_URI;
  if (!base) throw new Error("Set BASE_IMAGE_URI en .env (https://ipfs.io/ipfs/<CID>/traveler-)");
  console.log("BASE_IMAGE_URI:", base);

  // Predice dirección con nonce actual
  const nonce = await provider.getTransactionCount(deployer.address);
  const predicted = ethers.getCreateAddress({ from: deployer.address, nonce });
  console.log("Predicted NFT address:", predicted);

  // Fees (si el RPC da EIP-1559)
  const fee = await provider.getFeeData();
  const overrides = {
    gasLimit: 5_000_000n,
    ...(fee.maxFeePerGas ? { maxFeePerGas: fee.maxFeePerGas } : {}),
    ...(fee.maxPriorityFeePerGas ? { maxPriorityFeePerGas: fee.maxPriorityFeePerGas } : {})
  };

  const NFT = await ethers.getContractFactory("ZetaQuestNFT");
  const contract = await NFT.deploy(base, overrides);
  const tx = contract.deploymentTransaction();
  console.log("Deploy tx hash:", tx.hash);

  // Espera por código (no por receipt)
  await waitForCode(predicted);
  console.log("ZetaQuestNFT deployed at:", predicted);
}

main().catch((e)=>{ console.error(e); process.exit(1); });



