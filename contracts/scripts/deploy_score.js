const { ethers } = require("hardhat");

async function waitCode(addr, provider, ms=180000, step=3000){
  const t0 = Date.now();
  while(Date.now() - t0 < ms){
    const code = await provider.getCode(addr);
    if (code && code !== "0x") return;
    await new Promise(r=>setTimeout(r, step));
  }
  throw new Error("Timeout esperando código en " + addr);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await ethers.getContractFactory("ZetaQuestScore");
  const predicted = ethers.getCreateAddress({ from: deployer.address, nonce: await ethers.provider.getTransactionCount(deployer.address) });
  const c = await Factory.deploy(deployer.address);
  console.log("Deploy tx:", c.deploymentTransaction().hash);
  await waitCode(predicted, ethers.provider);
  console.log("Score deployed at:", predicted);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
