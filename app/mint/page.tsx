"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import WalletConnect from "../../components/wallet-connect";
import { ZETAQUEST_NFT_ABI } from "../lib/abi/zetaquestNft";

const ART = {
  bg: "/art/bg-2.png",
  traveler: "/art/idle.gif",
  coin: "/art/coin.png",
  confetti: "/art/confetti.gif",
};

const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS as `0x${string}` | undefined;
const ZETA_TESTNET_ID = Number(process.env.NEXT_PUBLIC_ZETA_TESTNET || "7001");

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isMinting } = useWriteContract();

  const [hasNft, setHasNft] = useState<boolean | null>(null);
  const [mintedImg, setMintedImg] = useState<string | null>(null);
  const [mintedRarity, setMintedRarity] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Si llega aquí desconectado, mándalo a la landing
  useEffect(() => {
    if (!isConnected) window.location.replace("/");
  }, [isConnected]);

  // helper
  function parseDataURIJson(uri: string) {
    if (!uri?.startsWith("data:application/json;base64,")) return null;
    try {
      return JSON.parse(atob(uri.split(",")[1] || ""));
    } catch {
      return null;
    }
  }

  // Chequeo inicial: si ya tiene NFT, trae imagen/rareza
  useEffect(() => {
    (async () => {
      if (!isConnected || !address || !NFT_ADDRESS || !publicClient) return;
      try {
        const bal: bigint = await publicClient.readContract({
          address: NFT_ADDRESS,
          abi: ZETAQUEST_NFT_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        setHasNft(bal > 0n);
        if (bal > 0n) {
          const tokenId: bigint = await publicClient.readContract({
            address: NFT_ADDRESS,
            abi: ZETAQUEST_NFT_ABI,
            functionName: "tokenOfOwnerByIndex",
            args: [address, 0n],
          });
          const uri: string = await publicClient.readContract({
            address: NFT_ADDRESS,
            abi: ZETAQUEST_NFT_ABI,
            functionName: "tokenURI",
            args: [tokenId],
          });
          const meta = parseDataURIJson(uri);
          if (meta?.image) setMintedImg(meta.image);
          const attr = (meta?.attributes || []).find((a: any) => `${a?.trait_type}`.toLowerCase() === "rarity");
          if (attr?.value) setMintedRarity(attr.value);
        }
      } catch {}
    })();
  }, [isConnected, address, publicClient]);

  // Cuando ya tiene NFT → confetti + redirección
  useEffect(() => {
    if (hasNft) {
      setShowConfetti(true);
      const t = setTimeout(() => window.location.replace("/app"), 1600);
      return () => clearTimeout(t);
    }
  }, [hasNft]);

  async function mint() {
    if (!isConnected) return; // guard: la landing maneja la conexión
    if (!NFT_ADDRESS) return alert("Falta NEXT_PUBLIC_NFT_ADDRESS en .env.local");

    try {
      if (chainId !== ZETA_TESTNET_ID) {
        await switchChainAsync({ chainId: ZETA_TESTNET_ID });
      }
      const hash = await writeContractAsync({
        address: NFT_ADDRESS,
        abi: ZETAQUEST_NFT_ABI,
        functionName: "mint",
      });

      // esperar confirmación con tolerancia
      let ok = false;
      for (let i = 0; i < 12; i++) {
        try {
          await publicClient!.waitForTransactionReceipt({ hash, pollingInterval: 2000 });
          ok = true; break;
        } catch {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // volver a leer balance/URI
      if (address) {
        const bal: bigint = await publicClient!.readContract({
          address: NFT_ADDRESS,
          abi: ZETAQUEST_NFT_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        if (bal > 0n) {
          const tokenId: bigint = await publicClient!.readContract({
            address: NFT_ADDRESS,
            abi: ZETAQUEST_NFT_ABI,
            functionName: "tokenOfOwnerByIndex",
            args: [address, 0n],
          });
          const uri: string = await publicClient!.readContract({
            address: NFT_ADDRESS,
            abi: ZETAQUEST_NFT_ABI,
            functionName: "tokenURI",
            args: [tokenId],
          });
          const meta = parseDataURIJson(uri);
          if (meta?.image) setMintedImg(meta.image);
          const attr = (meta?.attributes || []).find((a: any) => `${a?.trait_type}`.toLowerCase() === "rarity");
          if (attr?.value) setMintedRarity(attr.value);
          setHasNft(true);        // dispara confetti + redirect por el efecto
          setShowConfetti(true);  // (extra) por si quieres verlo instantáneo
        }
      }

      if (!ok) console.warn("No se confirmó receipt, pero se releyó el estado.");
    } catch (e) {
      console.error(e);
      alert("Mint falló. Revisa consola / fondos / red.");
    }
  }

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Fondo */}
      <div className="fixed inset-0 -z-10">
        <img src={ART.bg} alt="bg" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.45)_60%,rgba(0,0,0,0.75)_100%)]" />
      </div>

      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between">
        <div className="font-pixel text-lg drop-shadow">ZETAQUEST – MINT</div>
        <div className="flex items-center gap-3">
          <WalletConnect redirectToOnDisconnect="/" />
        </div>
      </header>

      <section className="mx-auto max-w-6xl p-4 grid md:grid-cols-2 gap-6 items-center">
        {/* Izquierda: arte/preview */}
        <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm p-6">
          <div className="relative w-full aspect-square">
            <Image
              src={mintedImg ?? ART.traveler}
              alt="traveler"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="mt-4 text-sm opacity-80">
            {mintedRarity ? (
              <span>Congrats! You minted a <span className="font-pixel">{mintedRarity}</span> Traveler.</span>
            ) : (
              <span>Claim your first <span className="font-pixel">Traveler</span> to start ZetaQuest.</span>
            )}
          </div>
        </div>

        {/* Derecha: card de mint */}
        <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3">
            <Image src={ART.coin} alt="coin" width={24} height={24} />
            <h2 className="font-pixel text-xl">Mint your Traveler</h2>
          </div>
          <p className="mt-3 text-sm opacity-80">
            Un NFT por cuenta. Rarezas: Normal (80%), Rare (18%), Epic (2%). Se revela on-chain.
          </p>

          <ul className="mt-4 space-y-2 text-sm">
            <li>• Red requerida: <span className="font-press">ZetaChain Athens (7001)</span></li>
            <li>• Imágenes servidas desde tu app para el MVP</li>
          </ul>

          {/* Botón → Confetti */}
          <div className="mt-6 min-h-[56px] flex items-center">
            {hasNft ? (
              showConfetti ? (
                <Image
                  src={ART.confetti}
                  alt="confetti"
                  width={220}
                  height={56}
                  unoptimized
                  className="rounded-md"
                />
              ) : (
                <a
                  href="/app"
                  className="font-press inline-block px-5 py-3 rounded-xl bg-emerald-400 text-black hover:brightness-110"
                >
                  Go to Dashboard
                </a>
              )
            ) : showConfetti ? (
              <Image
                src={ART.confetti}
                alt="confetti"
                width={220}
                height={56}
                unoptimized
                className="rounded-md"
              />
            ) : (
              <button
                onClick={mint}
                disabled={isMinting || !NFT_ADDRESS}
                className="font-press px-5 py-3 rounded-xl bg-cyan-400 text-black hover:brightness-110 disabled:opacity-60"
              >
                {isMinting ? "Minting..." : "Mint NFT"}
              </button>
            )}
          </div>

          {!NFT_ADDRESS && (
            <div className="mt-3 text-[10px] px-2 py-1 rounded bg-red-500/20 border border-red-400/40 inline-block">
              Falta <code>NEXT_PUBLIC_NFT_ADDRESS</code>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
