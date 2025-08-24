"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useRouter } from "next/navigation";
import { createPublicClient, http } from "viem";

import WalletConnect from "../../components/wallet-connect";
import HoloCard from "../../components/HoloCard";
import PixelBG from "../../components/PixelBG";
import TravelButton from "../../components/TravelButton";

import { ZETAQUEST_NFT_ABI } from "../lib/abi/zetaquestNft";
import { zetaAthens, zetaRpc } from "../lib/zeta";

/* ========= Helpers ========= */
function cx(...s: (string | false | undefined)[]) {
  return s.filter(Boolean).join(" ");
}

/* ========= ASSETS ========= */
const ART = {
  traveler: "/art/desaparece.gif",
  ethIcon: "/art/eth.png",
  polIcon: "/art/polygon.png",
  bnbIcon: "/art/bnb.png",
  quest: "/art/quest-complete.png",
  levelup: "/art/levelup.png",
  travelerEth: "/art/traveler-eth.png",
  travelerPol: "/art/traveler-pol.png",
  travelerBnb: "/art/traveler-bnb.png",
  coin: "/art/coin.png",
};

/* ========= WORLD map (UI) ========= */
const WORLDS: Record<number, { key: "ethereum" | "polygon" | "bnb"; label: string; icon: string }> = {
  7001: { key: "ethereum", label: "Zeta (Athens)", icon: ART.ethIcon },
  80002: { key: "polygon", label: "Polygon Amoy", icon: ART.polIcon },
  97: { key: "bnb", label: "BNB Chain", icon: ART.bnbIcon },
  11155111: { key: "ethereum", label: "Ethereum Sepolia", icon: ART.ethIcon },
};

/* ========= Buffs UX ========= */
const CHAIN_BUFFS = {
  ethereum: { power: 1.1, defense: 1.0, xp: 1.0, label: "Ethereum", icon: ART.ethIcon },
  polygon: { power: 1.0, defense: 1.15, xp: 1.0, label: "Polygon", icon: ART.polIcon },
  bnb: { power: 1.0, defense: 1.0, xp: 1.2, label: "BNB Chain", icon: ART.bnbIcon },
} as const;

type ChainKey = "ethereum" | "polygon" | "bnb";
type Quest = { title: string; objectives: string[]; status: "active" | "completed" };
const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS as `0x${string}` | undefined;

export default function Dashboard() {
  /* ------- Estado derivado del tokenURI ------- */
  const [chain, setChain] = useState<ChainKey>("ethereum");
  const [xpByChain, setXpByChain] = useState<Record<ChainKey, number>>({
    ethereum: 0,
    polygon: 0,
    bnb: 0,
  });
  const [base, setBase] = useState<{ power: number; defense: number }>({ power: 10, defense: 10 });

  /* ------- UI / UX ------- */
  const [quest, setQuest] = useState<Quest | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(true);

  // Banner pegajoso (indicador post‑TX)
  const [syncMsg, setSyncMsg] = useState<string>("");
  const [syncVisible, setSyncVisible] = useState<boolean>(false);

  // Last on‑chain (HUD) + history
  const [lastOnchain, setLastOnchain] = useState<{ world?: number; p?: number; d?: number; xp?: number } | null>(null);
  const [history, setHistory] = useState<Array<{ ts: number; w: number; p: number; d: number; xp: number }>>([]);

  /* ------- Animación de viaje (overlay) ------- */
  const [travelAnim, setTravelAnim] = useState<{ visible: boolean; src: string }>({ visible: false, src: "" });
  const TRAVEL_SPRITE_BY_WORLD: Record<number, string> = {
    80002: ART.travelerPol,
    97: ART.travelerBnb,
    11155111: ART.travelerEth,
  };

  /* ------- Selector de red (toggle) ------- */
  const [selectedWorld, setSelectedWorld] = useState<number>(80002);
  const TOGGLE_WORLDS: Array<{ id: number; key: ChainKey; label: string; icon: string }> = [
    { id: 11155111, key: "ethereum", label: "Ethereum", icon: ART.ethIcon },
    { id: 80002, key: "polygon", label: "Polygon Amoy", icon: ART.polIcon },
    { id: 97, key: "bnb", label: "BNB Testnet", icon: ART.bnbIcon },
  ];

  /* ------- Wallet / RPC ------- */
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();

  /* ------- NFT visual ------- */
  const [nftImage, setNftImage] = useState<string | null>(null);
  const [nftRarity, setNftRarity] = useState<"Normal" | "Rare" | "Epic" | null>(null);

  /* ------- Stats derivados de UI ------- */
  const buffs = CHAIN_BUFFS[chain];
  const stats = useMemo(() => {
    const power = Math.round(base.power * buffs.power);
    const defense = Math.round(base.defense * buffs.defense);
    const xpChain = Math.round(xpByChain[chain] * buffs.xp);
    const total = xpByChain.ethereum + xpByChain.polygon + xpByChain.bnb;
    return { power, defense, xpChain, total };
  }, [base, buffs, xpByChain, chain]);

  /* ------- Onboarding modal (solo 1ª vez) ------- */
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    try {
      const seen = localStorage.getItem("zq:intro:v1");
      if (!seen) setShowIntro(true);
    } catch {}
  }, []);
  function closeIntro(persist = false) {
    if (persist) {
      try {
        localStorage.setItem("zq:intro:v1", "1");
      } catch {}
    }
    setShowIntro(false);
  }

  /* ------- Helpers ------- */
  function parseDataURIJson(uri: string) {
    if (!uri?.startsWith("data:application/json;base64,")) return null;
    try {
      return JSON.parse(atob(uri.split(",")[1] || ""));
    } catch {
      return null;
    }
  }
  const num = (x: any, def = 0) => {
    const n = Number(String(x ?? "").replace(/[^\d\-+]/g, ""));
    return Number.isFinite(n) ? n : def;
  };

  /* ------- API local MVP ------- */
  useEffect(() => {
    (async () => {
      try {
        const url = isConnected && address ? `/api/player?address=${address}` : `/api/player`;
        const r = await fetch(url, { cache: "no-store" });
        const j = await r.json();
        if (j?.player) setXpByChain(j.player.xpByChain);
      } finally {
        setLoadingPlayer(false);
      }
    })();
  }, [isConnected, address]);

  /* ------- LECTURA ÚNICA: tokenURI del NFT v2 ------- */
  async function refreshFromTokenURI(showIndicator: boolean) {
    if (!publicClient || !address || !NFT_ADDRESS) return;

    try {
      const balance: bigint = await publicClient.readContract({
        address: NFT_ADDRESS,
        abi: ZETAQUEST_NFT_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      if (balance === 0n) {
        router.replace("/mint");
        return;
      }

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
      if (!meta) return;

      if (meta?.image) setNftImage(meta.image);
      const rarityAttr = (meta?.attributes || []).find((a: any) => `${a?.trait_type}`.toLowerCase() === "rarity");
      if (rarityAttr?.value) setNftRarity(rarityAttr.value as any);

      const getAttr = (name: string) =>
        (meta.attributes as any[]).find((x: any) => `${x?.trait_type}`.toLowerCase() === name.toLowerCase())?.value;

      const worldId = num(getAttr("world"));
      const buffP = num(getAttr("buff_power"));
      const buffD = num(getAttr("buff_defense"));
      const xpVal = num(getAttr("xp"));

      const worldMeta = WORLDS[worldId];
      if (worldMeta) setChain(worldMeta.key);

      setBase({ power: 10 + buffP, defense: 10 + buffD });
      if (worldMeta) setXpByChain((prev) => ({ ...prev, [worldMeta.key]: xpVal }));

      setLastOnchain({ world: worldId || undefined, p: 10 + buffP, d: 10 + buffD, xp: xpVal });
      if (worldId) {
        setHistory((h) => {
          const item = { ts: Date.now(), w: worldId, p: 10 + buffP, d: 10 + buffD, xp: xpVal };
          return [item, ...h].slice(0, 3);
        });
      }

      if (showIndicator) {
        const msg = `On-chain ✔ WORLD=${worldId || "?"} • P=${10 + buffP} • D=${10 + buffD} • XP=${xpVal}`;
        setSyncMsg(msg);
        setSyncVisible(true);
        setTimeout(() => setSyncVisible(false), 25000);
      }
    } catch (e) {
      console.warn("refreshFromTokenURI error", e);
    }
  }

  useEffect(() => {
    refreshFromTokenURI(false);
  }, [publicClient, address]);

  // Eventos (defer para evitar setState durante render de otro componente)
  useEffect(() => {
    function onSync() {
      requestAnimationFrame(() => refreshFromTokenURI(true));
    }
    window.addEventListener("zq:sync", onSync);
    return () => window.removeEventListener("zq:sync", onSync);
  }, [publicClient, address]);

  useEffect(() => {
    function onTravelDone(e: any) {
      const world: number | undefined = e?.detail?.world;
      const src = world ? TRAVEL_SPRITE_BY_WORLD[world] : undefined;
      if (!src) return;
      requestAnimationFrame(() => {
        setTravelAnim({ visible: true, src });
        setTimeout(() => setTravelAnim({ visible: false, src: "" }), 1600);
      });
    }
    window.addEventListener("zq:travel:done", onTravelDone);
    return () => window.removeEventListener("zq:travel:done", onTravelDone);
  }, []);

  /* ------- Quests (UI/MVP) ------- */
  async function newQuest() {
    try {
      const r = await fetch("/api/quests/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worldId: selectedWorld,
          chainKey: chain, // "ethereum" | "polygon" | "bnb"
          chainLabel: CHAIN_BUFFS[chain].label,
        }),
      });
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
  async function rerollQuest() {
    await newQuest();
  }

  async function completeQuest() {
    if (!quest || !address) return;

    setQuest({ ...quest, status: "completed" });

    try {
      const r = await fetch("/api/quests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: address, amount: 10 }),
      });
      const j = await r.json();

      if (j?.ok) {
        setTimeout(() => {
          window.dispatchEvent(new Event("zq:sync"));
          refreshFromTokenURI(true);
        }, 1800);
      } else {
        console.warn("addXp failed", j);
      }
    } catch (e) {
      console.warn("addXp error", e);
    }

    setShowLevelUp(true);
    setTimeout(() => setShowLevelUp(false), 1100);
  }

  /* ------- Guard NFT ------- */
  useEffect(() => {
    (async () => {
      try {
        if (!isConnected || !address || !NFT_ADDRESS) return;
        const pc = createPublicClient({ chain: zetaAthens, transport: http(zetaRpc) });
        const bal: bigint = await pc.readContract({
          address: NFT_ADDRESS,
          abi: ZETAQUEST_NFT_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        if (bal === 0n) router.replace("/mint");
      } catch (err) {
        console.warn("Guard NFT: lectura falló, no redirijo a /mint", err);
      }
    })();
  }, [isConnected, address, router]);

  /* ------- Robustez: mundo válido ------- */
  useEffect(() => {
    const valid = [11155111, 80002, 97];
    if (!valid.includes(selectedWorld)) setSelectedWorld(80002);
  }, [selectedWorld]);

  const readyToTravel = isConnected && !!selectedWorld;

  /* ====== UI ====== */
  return (
    <main className="relative min-h-screen text-white">
      {/* BG al fondo, sin capturar eventos */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <PixelBG />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 py-4 flex items-center justify-between">
        <div className="font-pixel text-lg drop-shadow">ZETAQUEST – DASHBOARD</div>
        <div className="flex items-center gap-3">
          {syncVisible && (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-md text-xs">
              <span>{syncMsg}</span>
              <button onClick={() => setSyncVisible(false)} className="opacity-70 hover:opacity-100" aria-label="close">
                ✕
              </button>
            </div>
          )}
          <WalletConnect redirectToOnDisconnect="/" />
        </div>
      </header>

      {/* HUD superior */}
      <section className="relative z-10 mx-auto max-w-6xl px-4">
        <HoloCard>
          <div className="grid gap-3 md:grid-cols-4 p-3">
            {/* NFT */}
            <div className="flex items-center gap-3 rounded-xl p-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg ring-1 ring-white/10">
                <Image src={nftImage ?? ART.traveler} alt="nft" fill className="object-cover" unoptimized />
              </div>
              <div className="text-xs leading-tight">
                <div className="font-pixel">NFT</div>
                <div className="opacity-80">{nftRarity ? `Traveler • ${nftRarity}` : "Traveler"}</div>
              </div>
            </div>

            {/* WORLD */}
            <div className="flex items-center gap-3 rounded-xl p-3">
              <Image src={CHAIN_BUFFS[chain].icon} alt="world" width={18} height={18} />
              <div className="text-xs leading-tight">
                <div className="font-pixel capitalize">{CHAIN_BUFFS[chain].label}</div>
                {lastOnchain && (
                  <div className="text-[10px] opacity-80 mt-1">
                    On-chain: W={lastOnchain.world} • P={lastOnchain.p} • D={lastOnchain.d} • XP={lastOnchain.xp}
                  </div>
                )}
              </div>
            </div>

            {/* BUFF */}
            <div className="flex items-center gap-3 rounded-xl p-3">
              <div className="text-xs leading-tight">
                <div className="font-pixel">BUFF</div>
                <div className="opacity-80 flex gap-3">
                  <span>{Math.round((CHAIN_BUFFS[chain].power - 1) * 100)}% Pow</span>
                  <span>{Math.round((CHAIN_BUFFS[chain].defense - 1) * 100)}% Def</span>
                  <span>{Math.round((CHAIN_BUFFS[chain].xp - 1) * 100)}% XP</span>
                </div>
              </div>
            </div>

            {/* STATS / ZetaPoints con iconos debajo */}
            <div className="flex items-center justify-between rounded-xl p-3">
              <div className="text-xs leading-tight">
                <div className="font-pixel">STATS</div>
                <div className="opacity-80">P {stats.power} • D {stats.defense}</div>
              </div>

              <div className="text-right">
                <div className="text-[10px] opacity-80">ZetaPoints (XP)</div>
                <div className="font-pixel text-2xl leading-none">{stats.xpChain}</div>
                <div className="mt-1 flex justify-end gap-2">
                  <img src={ART.coin} alt="coin" width={22} height={22} className="shrink-0" />
                  <img src={CHAIN_BUFFS[chain].icon} alt={CHAIN_BUFFS[chain].label} width={22} height={22} className="shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="px-3 pb-3">
              <div className="font-pixel text-xs opacity-80 mb-1">Last on‑chain updates</div>
              <ul className="text-[11px] opacity-80 space-y-1">
                {history.map((h, i) => (
                  <li key={i}>
                    {new Date(h.ts).toLocaleTimeString()} — W={h.w} • P={h.p} • D={h.d} • XP={h.xp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </HoloCard>
      </section>

      {/* Cuerpo */}
      <section className="relative z-10 mx-auto max-w-6xl p-4 grid md:grid-cols-3 gap-6 mt-4">
        {/* IZQ */}
        <HoloCard className="md:col-span-1">
          <div className="p-4">
            <div className="relative w-full aspect-square">
              <Image src={nftImage ?? ART.traveler} alt="traveler" fill className="object-contain" unoptimized />
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
                <div className="text-[10px] opacity-70">ZetaPoints (XP)</div>
                <div className="font-pixel text-xl">{stats.xpChain}</div>
                <div className="text-[10px] opacity-60 mt-1">Total: {stats.total}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Image src={CHAIN_BUFFS[chain].icon} alt={CHAIN_BUFFS[chain].label} width={18} height={18} />
              <div className="text-sm">
                Current world: <span className="font-pixel capitalize">{CHAIN_BUFFS[chain].label}</span>
              </div>
            </div>

            {/* Selector de red + Travel */}
            <div className="mt-4 space-y-3">
              {/* TOGGLE */}
              <div className="rounded-xl bg-white/5 p-1 border border-white/10 overflow-hidden">
                <div className="grid grid-cols-3 gap-1">
                  {TOGGLE_WORLDS.map((w) => {
                    const active = selectedWorld === w.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => {
                          setSelectedWorld(w.id);
                          setChain(w.key);
                        }}
                        className={cx(
                          "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition",
                          active ? "bg-white text-black" : "bg-transparent text-white hover:bg-white/10"
                        )}
                        title={w.label}
                      >
                        <Image src={w.icon} alt={w.label} width={14} height={14} />
                        <span className={cx(!active && "opacity-90")}>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BOTÓN TRAVEL */}
              <div className="relative z-40 isolate">
                <div className="w-full pointer-events-auto">
                  <TravelButton key={`${selectedWorld}-${address || "na"}`} dstChainId={selectedWorld} />
                </div>
                {!readyToTravel && (
                  <div className="absolute inset-0 rounded-xl bg-transparent pointer-events-none" />
                )}
              </div>
            </div>
          </div>
        </HoloCard>

        {/* DER */}
        <HoloCard className="md:col-span-2">
          <div className="p-4">
            {loadingPlayer ? (
              <div className="min-h-[320px] grid place-items-center opacity-80">Loading player…</div>
            ) : !quest ? (
              <div className="min-h-[320px] grid place-items-center">
                <button
                  onClick={newQuest}
                  className="font-press px-5 py-3 rounded-xl bg-cyan-400 text-black hover:brightness-110"
                >
                  New Gemini Quest
                </button>
              </div>
            ) : (
              <div>
                {/* Encabezado de la quest con badge Gemini */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-[2px] rounded-full bg-gradient-to-r from-indigo-500/30 to-cyan-500/30 border border-white/15 uppercase tracking-wider">
                      Gemini
                    </span>
                    <h2 className="font-pixel text-xl">{quest.title}</h2>
                  </div>
                  {quest.status === "completed" && (
                    <Image src={ART.quest} alt="Quest Complete" width={160} height={42} unoptimized />
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
                      <button
                        onClick={completeQuest}
                        className="font-press px-4 py-3 rounded-xl bg-emerald-400 text-black hover:brightness-110"
                      >
                        Complete Quest (+10 ZP)
                      </button>
                      <button
                        onClick={rerollQuest}
                        className="font-press px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15"
                      >
                        New Gemini Quest
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={newQuest}
                      className="font-press px-4 py-3 rounded-xl bg-cyan-400 text-black hover:brightness-110"
                    >
                      New Gemini Quest
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </HoloCard>
      </section>

      {/* Intro Modal */}
      {showIntro && (
        <div className="fixed inset-0 z-[9000]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 h-full w-full grid place-items-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-black/80 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-pixel text-lg">Welcome to ZetaQuest</h3>
                <button
                  onClick={() => closeIntro(false)}
                  className="text-sm px-2 py-1 rounded bg-white/10 hover:bg-white/15"
                >
                  ✕
                </button>
              </div>

              <ul className="space-y-3 text-sm leading-5">
                <li>1) <b>Connect your wallet</b> (top-right).</li>
                <li>2) <b>Travel on‑chain</b>: pick a world (Ethereum / Polygon / BNB) and press <i>Travel</i>.</li>
                <li>3) Click <b>New Gemini Quest</b> to generate an AI quest (English, web3/travel themed).</li>
                <li>4) <b>Complete Quest</b> → earns <b>ZetaPoints</b> (XP) on‑chain.</li>
                <li>5) HUD: Power/Defense and <b>ZetaPoints</b>. Note: ZP = XP × world buff.</li>
              </ul>

              <div className="mt-5 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs opacity-80">
                  <input
                    type="checkbox"
                    onChange={(e) => e.target.checked
                      ? localStorage.setItem("zq:intro:v1", "1")
                      : localStorage.removeItem("zq:intro:v1")}
                  />
                  Don’t show again
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => closeIntro(true)}
                    className="font-press px-4 py-2 rounded-lg bg-cyan-400 text-black hover:brightness-110"
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay TRAVEL BURST */}
      {travelAnim.visible && (
        <div className="pointer-events-none fixed inset-0 z-[9500] grid place-items-center">
          <div className="absolute inset-0 bg-black/40 animate-[fadeBg_1.6s_ease]" />
          <img
            src={travelAnim.src}
            alt="Travel animation"
            className="w-[240px] h-[240px] object-contain animate-[popIn_1.6s_ease]"
            style={{
              filter:
                nftRarity === "Epic"
                  ? "drop-shadow(0 0 18px rgba(255,215,0,.8))"
                  : nftRarity === "Rare"
                  ? "drop-shadow(0 0 14px rgba(168,85,247,.7))"
                  : "drop-shadow(0 0 10px rgba(59,130,246,.6))",
            }}
          />
        </div>
      )}

      {/* Overlay LEVEL UP (encima de todo y nítido) */}
      {showLevelUp && (
        <div className="pointer-events-none fixed inset-0 z-[9999] grid place-items-center">
          <Image
            src={ART.levelup}
            alt="LEVEL UP"
            width={420}
            height={120}
            className="animate-[fade_1.1s_ease-out] drop-shadow-[0_0_24px_rgba(255,255,255,0.6)]"
            priority
          />
        </div>
      )}

      <style>{`
        @keyframes fadeBg {
          0% { opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) rotate(-2deg); filter: blur(2px); }
          20% { opacity: 1; transform: scale(1.08) rotate(0deg); filter: blur(0); }
          70% { opacity: 1; transform: scale(1.0); }
          100% { opacity: 0; transform: scale(1.0); }
        }
      `}</style>
    </main>
  );
}
