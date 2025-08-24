const { ethers } = require("hardhat");

async function main() {
  const player = process.env.PLAYER || "0x90B3EA700173274560182CbF76ED8E6E66Ad2494";
  const scoreAddr = process.env.SCORE_ADDRESS || process.env.SCORE_V2_ADDRESS || "0xabF095e6EAFD0884f23f444da6b7482876CFB965";
  const scoreName = process.env.SCORE_V2_ADDRESS ? "ScoreV2" : "Score";
  const nftAddr   = process.env.NEXT_PUBLIC_NFT_ADDRESS || "0x3DbAfeC83B70a60A0d2e0Fcc984a500fdAEAdDFF";

  const score = await ethers.getContractAt(scoreName, scoreAddr);
  const nft   = await ethers.getContractAt("ZetaQuestNFTv2", nftAddr);

  const xpOnChain = (await score.xpOf(player)).toString();

  const bal = await nft.balanceOf(player);
  if (bal === 0n) return console.log("Player no tiene NFT");
  const tokenId = await nft.tokenOfOwnerByIndex(player, 0n);
  const uri = await nft.tokenURI(tokenId);
  const json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));

  const get = (name) => (json.attributes||[]).find(a => String(a.trait_type).toLowerCase() === name.toLowerCase())?.value;
  const world = Number(get("world"));
  const buffP = Number(get("buff_power") || 0);
  const buffD = Number(get("buff_defense") || 0);
  const xp    = Number(get("xp") || 0);

  console.log("SCORE(", scoreName, ") xpOf:", xpOnChain);
  console.log("tokenURI => world:", world, "buffP:", buffP, "buffD:", buffD, "xp:", xp, "P:", 10 + buffP, "D:", 10 + buffD);
  console.log("Match XP?", String(xp) === String(xpOnChain) ? "✅" : "❌");
}

main().catch((e) => { console.error(e); process.exit(1); });
