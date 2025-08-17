const { ethers } = require("hardhat");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForCode(address, timeoutMs = 180_000, intervalMs = 3_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const code = await ethers.provider.getCode(address);
      if (code && code !== "0x") return true; // ya está desplegado
    } catch (_) {}
    await sleep(intervalMs);
  }
  throw new Error(`Timeout esperando código en ${address}`);
}

async function main() {
  const baseImage = process.env.BASE_IMAGE_URI || "http://localhost:3000/art/traveler-";
  const [deployer] = await ethers.getSigners();

  // 1) calcula la dirección predicha (nonce actual del deployer)
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  const predicted = ethers.getCreateAddress({ from: deployer.address, nonce });

  console.log("Deployer:", deployer.address);
  console.log("Nonce:", nonce);
  console.log("Predicted contract:", predicted);

  // 2) envía el deploy SIN esperar receipt
  const Factory = await ethers.getContractFactory("ZetaQuestNFT");
  const contract = await Factory.deploy(baseImage);
  const tx = contract.deploymentTransaction();
  console.log("Deploy tx hash:", tx.hash);

  // 3) espera a que haya código en la dirección predicha
  await waitForCode(predicted);

  console.log("ZetaQuestNFT deployed at:", predicted);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
