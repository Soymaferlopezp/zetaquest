const hre = require("hardhat");
const {
  Contract,
  JsonRpcProvider,
  Wallet,
  isAddress
} = require("ethers");

async function main() {
  const rpc = (process.env.RPC_ATHENS || "").trim();
  const pk  = (process.env.PRIVATE_KEY || "").trim();
  const nftAddrRaw  = (process.env.ZETAQUEST_NFT_ADDRESS || "").trim();
  const coreAddrRaw = (process.env.ZETAQUEST_CORE_ADDRESS || "").trim();

  if (!rpc || !pk) throw new Error("Faltan RPC_ATHENS o PRIVATE_KEY en .env");
  if (!isAddress(nftAddrRaw))  throw new Error("ZETAQUEST_NFT_ADDRESS inválida");
  if (!isAddress(coreAddrRaw)) throw new Error("ZETAQUEST_CORE_ADDRESS inválida");

  // Provider ethers “puro” (evita HardhatEthersProvider y ENS)
  const provider = new JsonRpcProvider(rpc, { chainId: 7001, name: "zetachain-athens" });
  const wallet   = new Wallet(pk, provider);

  console.log("Deployer:", wallet.address);
  console.log("Setting core on NFT:", coreAddrRaw);

  // ABI desde artifacts de Hardhat
  const artifact = await hre.artifacts.readArtifact("ZetaQuestNFT");
  const nft = new Contract(nftAddrRaw, artifact.abi, wallet);

  // EIP-1559 (si el RPC lo soporta)
  const fee = await provider.getFeeData();
  const overrides = {
    gasLimit: 200_000n,
    ...(fee.maxFeePerGas ? { maxFeePerGas: fee.maxFeePerGas } : {}),
    ...(fee.maxPriorityFeePerGas ? { maxPriorityFeePerGas: fee.maxPriorityFeePerGas } : {})
  };

  const tx = await nft.setCore(coreAddrRaw, overrides);
  console.log("tx hash:", tx.hash);
  const rc = await tx.wait();
  if (rc.status !== 1n) throw new Error("setCore failed");

  const current = await nft.core();
  console.log("NFT.core() ->", current);

  if (current.toLowerCase() !== coreAddrRaw.toLowerCase()) {
    throw new Error("core mismatch after tx");
  }
  console.log("✅ setCore OK ->", coreAddrRaw);
}

main().catch((e) => { console.error(e); process.exit(1); });




