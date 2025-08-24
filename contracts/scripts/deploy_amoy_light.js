const hre = require("hardhat");
const { ethers } = hre;
const { parseUnits } = require("ethers");

async function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
async function waitForCode(addr, timeoutMs = 180_000, intervalMs = 3_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const code = await ethers.provider.getCode(addr);
    if (code && code !== "0x") return true;
    await sleep(intervalMs);
  }
  throw new Error(`Timeout esperando código en ${addr}`);
}

function clamp(x, lo, hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

async function main() {
  const provider = ethers.provider;
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  const bal = await provider.getBalance(deployer.address);
  console.log("Balance (wei):", bal.toString());
  if (bal === 0n) throw new Error("Sin POL en Amoy. Carga faucet y reintenta.");

  // Predice address para log
  const nonce = await provider.getTransactionCount(deployer.address);
  const predicted = ethers.getCreateAddress({ from: deployer.address, nonce });
  console.log("Predicted Light address:", predicted);

  // Lee fee data de la red
  const fee = await provider.getFeeData();

  // Límites razonables (ajustables por env)
  const MIN_TIP  = parseUnits(process.env.MIN_TIP_GWEI  || "25", "gwei"); // min 25 gwei
  const MAX_TIP  = parseUnits(process.env.MAX_TIP_GWEI  || "40", "gwei"); // cap 40 gwei
  const MIN_MAXF = parseUnits(process.env.MIN_MAXF_GWEI || "50", "gwei"); // min 50 gwei
  const MAX_MAXF = parseUnits(process.env.MAX_MAXF_GWEI || "80", "gwei"); // cap 80 gwei

  const base = fee.lastBaseFeePerGas || parseUnits("20", "gwei");
  let tip  = fee.maxPriorityFeePerGas || MIN_TIP;
  let maxf = fee.maxFeePerGas || (base + tip * 2n);

  // Aplica clamps
  tip  = clamp(tip,  MIN_TIP,  MAX_TIP);
  maxf = clamp(maxf, MIN_MAXF, MAX_MAXF);
  // Asegura maxFee >= base + tip
  if (maxf < base + tip) maxf = base + tip;

  // Factory y estimación de gas (+15%)
  const Light = await ethers.getContractFactory("ZetaQuestLight");
  const deployTx = await Light.getDeployTransaction();
  const estimated = await provider.estimateGas({ ...deployTx, from: deployer.address, maxPriorityFeePerGas: tip, maxFeePerGas: maxf });
  const gasLimit = (estimated * 115n) / 100n;

  // Costo estimado (gwei->wei)
  const estCost = gasLimit * maxf;
  console.log("Fee plan:", {
    base: base.toString(),
    tip: tip.toString(),
    maxFee: maxf.toString(),
    gasLimit: gasLimit.toString(),
    estCostWei: estCost.toString()
  });

  if (bal < estCost) {
    console.warn("⚠️ Balance parece menor que el costo estimado. Si falla, sube MAX_TIP/MAX_MAXF por env o agrega POL.");
  }

  const light = await Light.deploy({
    gasLimit,
    maxPriorityFeePerGas: tip,
    maxFeePerGas: maxf
  });

  const tx = light.deploymentTransaction();
  console.log("Deploy tx hash:", tx.hash);

  await waitForCode(predicted);
  console.log("ZetaQuestLight deployed at:", predicted);
}

main().catch((e)=>{ console.error(e); process.exit(1); });





