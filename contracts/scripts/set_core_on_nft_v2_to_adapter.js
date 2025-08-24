require("dotenv").config();
const { ethers, artifacts } = require("hardhat");

function assertAddress(name, value) {
  if (!value) throw new Error(`Falta ${name}`);
  const addr = value.trim();
  if (!ethers.isAddress(addr)) throw new Error(`${name} inválida: ${value}`);
  return ethers.getAddress(addr);
}

async function main() {
  const NFT     = assertAddress("NEXT_PUBLIC_NFT_V2/NEXT_PUBLIC_NFT_ADDRESS", process.env.NEXT_PUBLIC_NFT_V2 || process.env.NEXT_PUBLIC_NFT_ADDRESS);
  const ADAPTER = assertAddress("ZETAQUEST_ADAPTER_ADDRESS", process.env.ZETAQUEST_ADAPTER_ADDRESS);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("NFT v2 :", NFT);
  console.log("Adapter:", ADAPTER);

  const abi = (await artifacts.readArtifact("ZetaQuestNFTv2")).abi; // ajusta si tu artifact se llama distinto
  const nft = new ethers.Contract(NFT, abi, deployer);

  const tx = await nft.setCore(ADAPTER);
  console.log("setCore tx:", tx.hash);
  await tx.wait();
  console.log("NFT v2 ahora lee Core = Adapter ✔");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
