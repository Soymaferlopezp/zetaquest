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

async function waitAllowed(core, chainId, timeoutMs = 120_000, intervalMs = 3_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await core.allowedDstChains(chainId);
      if (ok) return true;
    } catch(_) {}
    await sleep(intervalMs);
  }
  throw new Error(`Timeout esperando allowedDstChains(${chainId}) = true`);
}

async function main() {
  const provider = ethers.provider;
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance (wei):", (await provider.getBalance(deployer.address)).toString());

  const nftAddr = process.env.ZETAQUEST_NFT_ADDRESS;
  if (!nftAddr) throw new Error("Set ZETAQUEST_NFT_ADDRESS en .env (Athens NFT)");

  // Predice dirección del Core
  const nonce = await provider.getTransactionCount(deployer.address);
  const predicted = ethers.getCreateAddress({ from: deployer.address, nonce });
  console.log("Predicted Core address:", predicted);

  const fee = await provider.getFeeData();
  const overrides = {
    gasLimit: 6_000_000n,
    ...(fee.maxFeePerGas ? { maxFeePerGas: fee.maxFeePerGas } : {}),
    ...(fee.maxPriorityFeePerGas ? { maxPriorityFeePerGas: fee.maxPriorityFeePerGas } : {})
  };

  const Core = await ethers.getContractFactory("ZetaQuestCore");
  const core = await Core.deploy(nftAddr, overrides);
  const tx = core.deploymentTransaction();
  console.log("Deploy tx hash:", tx.hash);

  await waitForCode(predicted);
  console.log("ZetaQuestCore deployed at:", predicted);

  // Conecta la instancia al address predicho (por si ethers no lo actualizó aún)
  const coreAt = await ethers.getContractAt("ZetaQuestCore", predicted);

  // allowDstChain(80002) y verificar leyendo estado (no receipt)
  const tx2 = await coreAt.allowDstChain(80002, true, overrides);
  console.log("allowDstChain sent, tx:", tx2.hash);

  await waitAllowed(coreAt, 80002);
  console.log("Allowed dst chain 80002 (Amoy) ✔");
}

main().catch((e)=>{ console.error(e); process.exit(1); });


