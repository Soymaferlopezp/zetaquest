// contracts/scripts/set_core_on_nft_v2.js
const { ethers, artifacts } = require("hardhat");

function isAddr(x) {
  return /^0x[a-fA-F0-9]{40}$/.test(x || "");
}

async function main() {
  const nftAddr  = process.env.ZETAQUEST_NFT_ADDRESS;
  const coreAddr = process.env.ZETAQUEST_CORE_ADDRESS;

  if (!isAddr(nftAddr) || !isAddr(coreAddr)) {
    throw new Error("Set ZETAQUEST_NFT_ADDRESS y ZETAQUEST_CORE_ADDRESS en .env");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("NFTv2:", nftAddr);
  console.log("Core :", coreAddr);

  const abi = (await artifacts.readArtifact("ZetaQuestNFTv2")).abi;
  const nft = new ethers.Contract(nftAddr, abi, deployer);

  const current = await nft.core().catch(() => ethers.ZeroAddress);
  if (current && current.toLowerCase() === coreAddr.toLowerCase()) {
    console.log("Ya está seteado. ✅");
    return;
  }

  const tx = await nft.setCore(coreAddr);
  console.log("tx hash:", tx.hash);

  // Polling sencillo por RPCs "perezosos"
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const now = await nft.core();
      if (now.toLowerCase() === coreAddr.toLowerCase()) {
        console.log("Core seteado ✔");
        return;
      }
    } catch {}
  }
  console.log("WARNING: no se pudo confirmar por RPC, verifica en el explorer.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
