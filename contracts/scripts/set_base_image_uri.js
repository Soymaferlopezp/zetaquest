const { ethers } = require("hardhat");

async function main() {
  const nftAddr = process.env.ZETAQUEST_NFT_ADDRESS;
  const newBase = process.env.NEW_BASE_IMAGE_URI; // p.ej. https://ipfs.io/ipfs/<CID>/traveler-
  if (!nftAddr || !newBase) throw new Error("Set ZETAQUEST_NFT_ADDRESS and NEW_BASE_IMAGE_URI in .env");

  const nft = await ethers.getContractAt("ZetaQuestNFT", nftAddr);
  const tx = await nft.setBaseImageURI(newBase);
  await tx.wait();
  console.log("setBaseImageURI OK ->", newBase);
}

main().catch((e) => { console.error(e); process.exit(1); });
