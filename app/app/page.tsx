"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { createPublicClient, http } from "viem";
import { useRouter } from "next/navigation";
import WalletConnect from "../../components/wallet-connect";
import { ZETAQUEST_NFT_ABI } from "../lib/abi/zetaquestNft";
import { zetaAthens, zetaRpc } from "../lib/zeta";

/* ====== ASSETS (public/art) ====== */
const ART = {
  bg: "/art/bg-2.png",
  traveler: "/art/idle.gif", // fallback si no hay imagen del NFT
  ethIcon: "/art/eth.png",
  polIcon: "/art/polygon.png",
  bnbIcon: "/art/bnb.png",
  quest: "/art/quest-complete.png",
  levelup: "/art/levelup.png",
};

/* ====== BUFFS POR CHAIN ====== */
const CHAIN_BUFFS = {
  ethereum: { power: 1.1, defense: 1.0, xp: 1.0, label: "Ethereum", icon: ART.ethIcon },
  polygon:  { power: 1.0, defense: 1.15, xp: 1.0, label: "Polygon",  icon: ART.polIcon },
  bnb:      { power: 1.0, defense: 1.0,  xp: 1.2, label: "BNB Chain", icon: ART.bnbIcon },
} as const;

type ChainKey = "ethereum" | "polygon" | "bnb";
type Quest = { title: string; objectives: string[]; status: "active" | "completed" };

/* ====== ENV (frontend) ====== */
const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS as `0x${string}` | undefined;

export default function Dashboard() {
  /* ------- Player state ------- */
  const [chain, setChain] = useState<ChainKey>("ethereum");
  const [xpByChain, setXpByChain] = useState<Record<ChainKey, number>>({
    ethereum: 0,
    polygon: 0,
    bnb: 0,
  });
  const [quest, setQuest] = useState<Quest | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(true);

  /* ------- Wallet / wagmi ------- */
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();

  /* ------- NFT state (solo lectura) ------- */
  const [nftImage, setNftImage] = useState<string | null>(null);
  const [nftRarity, setNftRarity] = useState<"Normal" | "Rare" | "Epic" | null>(null);

  /* ------- Helpers ------- */
  const buffs = CHAIN_BUFFS[chain];
  const BASE = { power: 10, defense: 10 };

  const stats = useMemo(() => {
    const power = Math.round(BASE.power * buffs.power);
    const defense = Math.round(BASE.defense * buffs.defense);
    const xpChain = Math.round(xpByChain[chain] * buffs.xp);
    const total = xpByChain.ethereum + xpByChain.polygon + xpByChain.bnb;
    return { power, defense, xpChain, total };
  }, [buffs, xpByChain, chain]);

  function parseDataURIJson(uri: string) {
    if (!uri?.startsWith("data:application/json;base64,")) return null;
    const b64 = uri.split(",")[1] || "";
    try { return JSON.parse(atob(b64)); } catch { return null; }
  }

  /* ------- API Player load ------- */
  useEffect(() => {
    (async () => {
      try {
        const url = isConnected && address ? `/api/player?address=${address}` : `/api/player`;
        const r = await fetch(url, { cache: "no-store" });
        const j = await r.json();
        if (j?.player) {
          setChain(j.player.chain);
          setXpByChain(j.player.xpByChain);
        }
      } finally {
        setLoadingPlayer(false);
      }
    })();
  }, [isConnected, address]);

  /* ------- Travel ------- */
  async function travelTo(next: ChainKey) {
    setChain(next);
    try {
      await fetch("/api/player/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: next }),
      });
    } catch {}
  }

  /* ------- Quests ------- */
  async function newQuest() {
    try {
      const r = await fetch("/api/quests/new", { method: "POST" });
      const j = await r.json();
      if (j.quest) setQuest(j.quest as Quest);
    } catch {
      setQuest({
        title: "Offline Quest",
        objectives: ["Try again later", "Keep exploring", "Have fun"],
        status: "active",
      });
    }
  }
  async function rerollQuest() { await newQuest(); }

  async function completeQuest() {
    if (!quest) return;
    setQuest({ ...quest, status: "completed" });
    const delta = 10;
    try {
      const r = await fetch("/api/player/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain, delta }),
      });
      const j = await r.json();
      if (j?.ok && j?.player?.xpByChain) {
        setXpByChain(j.player.xpByChain as Record<ChainKey, number>);
      } else {
        setXpByChain((p) => ({ ...p, [chain]: p[chain] + delta }));
      }
    } catch {
      setXpByChain((p) => ({ ...p, [chain]: p[chain] + delta }));
    }
    setShowLevelUp(true);
    setTimeout(() => setShowLevelUp(false), 1100);
  }

  /* ------- NFT read ------- */
  async function readNft() {
    if (!publicClient || !address || !NFT_ADDRESS) return;
    try {
      const balance: bigint = await publicClient.readContract({
        address: NFT_ADDRESS,
        abi: ZETAQUEST_NFT_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      if (balance > 0n) {
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
        if (meta?.image) setNftImage(meta.image);
        const attr = (meta?.attributes || []).find(
          (a: any) => `${a?.trait_type}`.toLowerCase() === "rarity"
        );
        if (attr?.value) setNftRarity(attr.value as any);
      } else {
        setNftImage(null);
        setNftRarity(null);
      }
    } catch {}
  }
  useEffect(() => { readNft(); }, [publicClient, address]);

  /* ------- Guard: si NO tiene NFT, ir a /mint ------- */
useEffect(() => {
  (async () => {
    if (!isConnected || !address || !NFT_ADDRESS) return;

    const pc = createPublicClient({ chain: zetaAthens, transport: http(zetaRpc) });
    try {
      const bal: bigint = await pc.readContract({
        address: NFT_ADDRESS,
        abi: ZETAQUEST_NFT_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      if (bal === 0n) window.location.replace("/mint");
    } catch {
      // si falla la lectura de RPC, no bloqueamos el dashboard
    }
  })();
}, [isConnected, address, NFT_ADDRESS]);

  /* ====== UI ====== */
  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Fondo */}
      <div className="fixed inset-0 -z-10">
        <img src={ART.bg} alt="bg" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.45)_60%,rgba(0,0,0,0.75)_100%)]" />
      </div>

      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between">
        <div className="font-pixel text-lg drop-shadow">ZETAQUEST – DASHBOARD</div>
        <div className="flex items-center gap-3">
          <WalletConnect redirectToOnDisconnect="/" />
        </div>
      </header>

      {/* HUD superior */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-3 md:grid-cols-4 rounded-2xl border border-white/15 bg-black/30 backdrop-blur-sm p-3">
          {/* NFT (solo info, sin mint) */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg ring-1 ring-white/10">
                <Image
                  src={nftImage ?? ART.traveler}
                  alt="nft"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="text-xs">
                <div className="font-pixel">NFT</div>
                <div className="opacity-80">
                  {nftRarity ? `Traveler • ${nftRarity}` : "Traveler"}
                </div>
              </div>
            </div>
          </div>

          {/* WORLD */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <Image src={buffs.icon} alt="world" width={18} height={18} />
            <div className="text-xs">
              <div className="font-pixel">WORLD</div>
              <div className="opacity-80 capitalize">{buffs.label}</div>
            </div>
          </div>

          {/* BUFF */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs">
              <div className="font-pixel">BUFF</div>
              <div className="opacity-80 flex gap-3">
                <span>{Math.round((CHAIN_BUFFS[chain].power - 1) * 100)}% Pow</span>
                <span>{Math.round((CHAIN_BUFFS[chain].defense - 1) * 100)}% Def</span>
                <span>{Math.round((CHAIN_BUFFS[chain].xp - 1) * 100)}% XP</span>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs">
              <div className="font-pixel">STATS</div>
              <div className="opacity-80">P {stats.power} • D {stats.defense}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] opacity-70">ZetaPoints</div>
              <div className="font-pixel text-lg leading-none">{stats.xpChain}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Cuerpo */}
      <section className="mx-auto max-w-6xl p-4 grid md:grid-cols-3 gap-6 mt-4">
        {/* IZQ: personaje y travel */}
        <div className="md:col-span-1 rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm p-4">
          <div className="relative w-full aspect-square">
            <Image
              src={nftImage ?? ART.traveler}
              alt="traveler"
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] opacity-70">Power</div>
              <div className="font-pixel text-xl">{stats.power}</div>
            </div>
            <div>
              <div className="text-[10px] opacity-70">Defense</div>
              <div className="font-pixel text-xl">{stats.defense}</div>
            </div>
            <div>
              <div className="text-[10px] opacity-70">ZetaPoints</div>
              <div className="font-pixel text-xl">{stats.xpChain}</div>
              <div className="text-[10px] opacity-60 mt-1">Total: {stats.total}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Image src={buffs.icon} alt={buffs.label} width={18} height={18} />
            <div className="text-sm">
              Mundo actual: <span className="font-pixel capitalize">{buffs.label}</span>
            </div>
          </div>

          <div className="mt-3 text-[11px] opacity-80 flex gap-3">
            <span>{Math.round((CHAIN_BUFFS[chain].power - 1) * 100)}% Power</span>
            <span>{Math.round((CHAIN_BUFFS[chain].defense - 1) * 100)}% Defense</span>
            <span>{Math.round((CHAIN_BUFFS[chain].xp - 1) * 100)}% XP</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => travelTo("ethereum")} className="font-press px-3 py-2 rounded-md bg-white/10 hover:bg-white/15">ETH</button>
            <button onClick={() => travelTo("polygon")}  className="font-press px-3 py-2 rounded-md bg-white/10 hover:bg-white/15">Polygon</button>
            <button onClick={() => travelTo("bnb")}      className="font-press px-3 py-2 rounded-md bg-white/10 hover:bg-white/15">BNB</button>
          </div>
        </div>

        {/* DER: quests */}
        <div className="md:col-span-2 rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm p-4">
          {loadingPlayer ? (
            <div className="min-h-[320px] grid place-items-center opacity-80">Loading player…</div>
          ) : !quest ? (
            <div className="min-h-[320px] grid place-items-center">
              <button onClick={newQuest} className="font-press px-5 py-3 rounded-xl bg-cyan-400 text-black hover:brightness-110">
                New Quest
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-pixel text-xl">{quest.title}</h2>
                {quest.status === "completed" && (
                  <Image src={ART.quest} alt="Quest Complete" width={140} height={34} />
                )}
              </div>

              <div className="mt-4 grid md:grid-cols-3 gap-3">
                {quest.objectives.slice(0, 3).map((t, i) => (
                  <div key={i} className="rounded-xl border border-white/15 bg-white/5 p-4">
                    <div className="text-xs opacity-70 mb-1">Objective {i + 1}</div>
                    <div className="font-press text-sm">{t}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                {quest.status === "active" ? (
                  <>
                    <button onClick={completeQuest} className="font-press px-4 py-3 rounded-xl bg-emerald-400 text-black hover:brightness-110">
                      Complete Quest (+10 ZP)
                    </button>
                    <button onClick={rerollQuest} className="font-press px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15">
                      New Quest
                    </button>
                  </>
                ) : (
                  <button onClick={newQuest} className="font-press px-4 py-3 rounded-xl bg-cyan-400 text-black hover:brightness-110">
                    New Quest
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Overlay LEVEL UP */}
      {showLevelUp && (
        <div className="pointer-events-none fixed inset-0 grid place-items-center">
          <Image
            src={ART.levelup}
            alt="LEVEL UP"
            width={420}
            height={120}
            className="animate-[fade_1.1s_ease-out]"
          />
        </div>
      )}

      <style>{`
        @keyframes fade {
          0% { opacity: 0; transform: scale(0.95); }
          10% { opacity: 1; transform: scale(1.02); }
          90% { opacity: 1; }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>
    </main>
  );
}


