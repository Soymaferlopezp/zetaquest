require("dotenv").config();
const { ethers } = require("hardhat");

function assertAddress(name, value) {
  if (!value) throw new Error(`Falta ${name} en .env`);
  const addr = value.trim();
  if (!ethers.isAddress(addr)) {
    throw new Error(`${name} inválida: ${value}`);
  }
  return ethers.getAddress(addr); // normaliza checksum
}

async function waitCode(addr, provider, ms = 180000, step = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const code = await provider.getCode(addr);
    if (code && code !== "0x") return;
    await new Promise((r) => setTimeout(r, step));
  }
  throw new Error("Timeout esperando código en " + addr);
}

async function main() {
  const CORE  = assertAddress("ZETAQUEST_CORE_ADDRESS",  process.env.ZETAQUEST_CORE_ADDRESS);
  const SCORE = assertAddress("ZETAQUEST_SCORE_ADDRESS", process.env.ZETAQUEST_SCORE_ADDRESS);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Core   :", CORE);
  console.log("Score  :", SCORE);

  const Factory = await ethers.getContractFactory("ZetaQuestCoreAdapter");
  const predicted = ethers.getCreateAddress({
    from: deployer.address,
    nonce: await ethers.provider.getTransactionCount(deployer.address),
  });

  const c = await Factory.deploy(CORE, SCORE);
  console.log("Deploy tx:", c.deploymentTransaction().hash);

  await waitCode(predicted, ethers.provider);
  console.log("Adapter deployed at:", predicted);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

