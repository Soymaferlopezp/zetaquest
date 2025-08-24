// Reintenta setCore y verifica leyendo estado (sin depender de receipts)
const hre = require("hardhat");
const { Contract, JsonRpcProvider, Wallet, isAddress } = require("ethers");

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const rpc = (process.env.RPC_ATHENS || "").trim();
  const pk  = (process.env.PRIVATE_KEY || "").trim();
  const nftAddr  = (process.env.ZETAQUEST_NFT_ADDRESS || "").trim();
  const coreAddr = (process.env.ZETAQUEST_CORE_ADDRESS || "").trim();

  if (!rpc || !pk) throw new Error("Faltan RPC_ATHENS o PRIVATE_KEY en .env");
  if (!isAddress(nftAddr))  throw new Error("ZETAQUEST_NFT_ADDRESS inválida");
  if (!isAddress(coreAddr)) throw new Error("ZETAQUEST_CORE_ADDRESS inválida");

  const provider = new JsonRpcProvider(rpc, { chainId: 7001, name: "zetachain-athens" });
  const wallet   = new Wallet(pk, provider);

  console.log("Deployer:", wallet.address);
  console.log("Target core:", coreAddr);

  const artifact = await hre.artifacts.readArtifact("ZetaQuestNFT");
  const nft = new Contract(nftAddr, artifact.abi, wallet);

  // Chequeo previo: si ya está seteado, salimos
  try {
    const current = await nft.core();
    if (current.toLowerCase() === coreAddr.toLowerCase()) {
      console.log("Ya está seteado. ✅");
      return;
    }
  } catch (_) {}

  // 3 intentos con fee bump y polling por estado
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const fee = await provider.getFeeData();
      let maxFee = fee.maxFeePerGas || 10n ** 9n;
      let maxPri = fee.maxPriorityFeePerGas || 2n * 10n ** 6n;

      // Bump por intento
      const bump = BigInt(100 + attempt * 15); // +15% por intento
      maxFee = (maxFee * bump) / 100n;
      maxPri = (maxPri * bump) / 100n;

      const overrides = { gasLimit: 200_000n, maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPri };

      const tx = await nft.setCore(coreAddr, overrides);
      console.log(`[${attempt}/3] tx sent:`, tx.hash);

      // Polling de estado hasta 2 min (sin depender de receipts)
      const start = Date.now();
      while (Date.now() - start < 120_000) {
        await sleep(3000);
        try {
          const now = await nft.core();
          console.log("NFT.core() ->", now);
          if (now.toLowerCase() === coreAddr.toLowerCase()) {
            console.log("✅ setCore OK ->", coreAddr);
            return;
          }
        } catch (_) { /* sigue intentando */ }
      }

      console.warn(`[${attempt}/3] Timeout esperando que NFT.core() cambie. Reintento...`);
    } catch (e) {
      console.error(`[${attempt}/3] Error enviando tx:`, e.message || e);
      await sleep(4000);
    }
  }

  throw new Error("No se pudo setear core tras 3 intentos.");
}

main().catch((e) => { console.error(e); process.exit(1); });
