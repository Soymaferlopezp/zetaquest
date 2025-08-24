const { ethers } = require("hardhat");

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function waitForCode(addr, provider, timeoutMs=180_000, step=3000){
  const start = Date.now();
  while(Date.now()-start < timeoutMs){
    const code = await provider.getCode(addr);
    if (code && code !== "0x") return true;
    await sleep(step);
  }
  throw new Error(`Timeout esperando código en ${addr}`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;

  console.log("Deployer:", deployer.address);
  const bal = await provider.getBalance(deployer.address);
  console.log("Balance (wei):", bal.toString());

  const nonce = await provider.getTransactionCount(deployer.address);
  const predicted = ethers.getCreateAddress({ from: deployer.address, nonce });
  console.log("Predicted Light address:", predicted);

  const Factory = await ethers.getContractFactory("ZetaQuestLight");
  const contract = await Factory.deploy();
  const tx = await contract.deploymentTransaction();
  console.log("Deploy tx hash:", tx.hash);

  await waitForCode(predicted, provider);
  console.log("ZetaQuestLight (BNB testnet) deployed at:", predicted);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
