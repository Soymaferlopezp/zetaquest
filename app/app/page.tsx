"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { createPublicClient, http } from "viem";

import WalletConnect from "../../components/wallet-connect";
import HoloCard from "../../components/HoloCard";
import PixelBG from "../../components/PixelBG";
import TravelButton from "../../components/TravelButton";
import MainnetBadge from "../../components/MainnetBadge";

import { ZETAQUEST_NFT_ABI } from "../lib/abi/zetaquestNft";
import { zetaAthens, zetaRpc } from "../lib/zeta";

import OnboardingModal from "../../components/OnboardingModal";

/* ========= Helpers ========= */
function cx(...s: (string | false | undefined)[]) {
  return s.filter(Boolean).join(" ");
}

/* --- helpers para JSON seguro y elección aleatoria (por si luego vuelves a lista) --- */
function pick<T>(arr: T[], fallback: T): T {
  if (!Array.isArray(arr) || arr.length === 0) return fallback;
  return arr[Math.floor(Math.random() * arr.length)];
}
async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(text.slice(0, 280));
  }
  return res.json();
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
  97: { key: "bnb", label: "BNB Testnet", icon: ART.bnbIcon },
  11155111: { key: "ethereum", label: "Ethereum Sepolia", icon: ART.ethIcon },
};

/* ========= Buffs UX (decorativo) ========= */
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
  const [isCompleting, setIsCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false); // sello visual 1s

  // Banner pegajoso (indicador post‑TX)
  const [syncMsg, setSyncMsg] = useState<string>("");
  const [syncVisible, setSyncVisible] = useState<boolean>(false);

  // Last on‑chain (fijo en HUD) + history (últimos 3)
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
  const [selectedWorld, setSelectedWorld] = useState<number>(80002); // default Polygon Amoy
  const TOGGLE_WORLDS: Array<{ id: number; key: ChainKey; label: string; icon: string }> = [
    { id: 11155111, key: "ethereum", label: "Ethereum", icon: ART.ethIcon },
    { id: 80002, key: "polygon", label: "Polygon Amoy", icon: ART.polIcon },
    { id: 97, key: "bnb", label: "BNB Testnet", icon: ART.bnbIcon },
  ];

  /* ------- Wallet / RPC ------- */
  const { address, isConnected } = useAccount();
  const router = useRouter();

  // Cliente DEDICADO a Athens para TODAS las lecturas del NFT/Score
  const pcAthens = useMemo(() => createPublicClient({ chain: zetaAthens, transport: http(zetaRpc) }), []);

  /* ------- NFT visual ------- */
  const [nftImage, setNftImage] = useState<string | null>(null);
  const [nftRarity, setNftRarity] = useState<"Normal" | "Rare" | "Epic" | null>(null);

  /* ------- Estados NFT (evitar redirect loop a /mint) ------- */
  const [hasNft, setHasNft] = useState<boolean | null>(null); // null=desconocido
  const [checkingNft, setCheckingNft] = useState<boolean>(false);

  /* ------- Stats derivados de UI ------- */
  const buffs = CHAIN_BUFFS[chain];
  const stats = useMemo(() => {
    const power = Math.round(base.power * buffs.power);
    const defense = Math.round(base.defense * buffs.defense);
    const xpChain = Math.round(xpByChain[chain] * buffs.xp);
    const total = xpByChain.ethereum + xpByChain.polygon + xpByChain.bnb;
    return { power, defense, xpChain, total };
  }, [base, buffs, xpByChain, chain]);

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

  /* ------- Helper: refrescar totales por chain desde API ------- */
  async function refreshPlayerTotals(addr?: string) {
    if (!addr) return;
    try {
      const r = await fetch(`/api/player?address=${addr}&fresh=1`, { cache: "no-store" });
      const j = await r.json();
      if (j?.player?.xpByChain) {
        const nx = j.player.xpByChain as Record<"ethereum" | "polygon" | "bnb", number>;
        setXpByChain((prev) => ({
          ethereum: Math.max(prev.ethereum ?? 0, nx.ethereum ?? 0),
          polygon: Math.max(prev.polygon ?? 0, nx.polygon ?? 0),
          bnb: Math.max(prev.bnb ?? 0, nx.bnb ?? 0),
        }));
      }
    } catch (e) {
      console.warn("refreshPlayerTotals error", e);
    }
  }

  /* ------- API local MVP (solo inicial; verdad = tokenURI) ------- */
  useEffect(() => {
    (async () => {
      try {
        const url = isConnected && address ? `/api/player?address=${address}` : `/api/player`;
        const r = await fetch(url, { cache: "no-store" });
        const j = await r.json();
        if (j?.player?.xpByChain) {
          const nx = j.player.xpByChain as Record<"ethereum" | "polygon" | "bnb", number>;
          setXpByChain((prev) => ({
            ethereum: Math.max(prev.ethereum ?? 0, nx.ethereum ?? 0),
            polygon: Math.max(prev.polygon ?? 0, nx.polygon ?? 0),
            bnb: Math.max(prev.bnb ?? 0, nx.bnb ?? 0),
          }));
        }
      } finally {
        setLoadingPlayer(false);
      }
    })();
  }, [isConnected, address]);

  /* ------- LECTURA Única: tokenURI del NFT v2 (SIEMPRE en Athens) ------- */
  async function refreshFromTokenURI(showIndicator: boolean) {
    if (!pcAthens || !address || !NFT_ADDRESS) return;

    try {
      const balance: bigint = await pcAthens.readContract({
        address: NFT_ADDRESS,
        abi: ZETAQUEST_NFT_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      if (balance === 0n) {
        // NO redirigimos; mostramos CTA y limpiamos HUD
        setHasNft(false);
        setNftImage(null);
        setNftRarity(null);
        setLastOnchain({ world: undefined, p: 10, d: 10, xp: 0 });
        return;
      }
      setHasNft(true);

      const tokenId: bigint = await pcAthens.readContract({
        address: NFT_ADDRESS,
        abi: ZETAQUEST_NFT_ABI,
        functionName: "tokenOfOwnerByIndex",
        args: [address, 0n],
      });
      const uri: string = await pcAthens.readContract({
        address: NFT_ADDRESS,
        abi: ZETAQUEST_NFT_ABI,
        functionName: "tokenURI",
        args: [tokenId],
      });
      const meta = parseDataURIJson(uri);
      if (!meta) return;

      // Imagen + rareza
      if (meta?.image) setNftImage(meta.image);
      const rarityAttr = (meta?.attributes || []).find((a: any) => `${a?.trait_type}`.toLowerCase() === "rarity");
      if (rarityAttr?.value) setNftRarity(rarityAttr.value as any);

      // Atributos dinámicos v2
      const getAttr = (name: string) =>
        (meta.attributes as any[]).find((x: any) => `${x?.trait_type}`.toLowerCase() === name.toLowerCase())?.value;

      const worldId = num(getAttr("world"));
      const buffP = num(getAttr("buff_power"));
      const buffD = num(getAttr("buff_defense"));
      const xpVal = num(getAttr("xp"));

      // WORLD para UX
      const worldMeta = WORLDS[worldId];
      if (worldMeta) setChain(worldMeta.key);

      // base (10 + buff)
      setBase({ power: 10 + buffP, defense: 10 + buffD });

      // XP visual asignada a la chain actual (según WORLD) — nunca reducir
      if (worldMeta)
        setXpByChain((prev) => {
          const cur = prev[worldMeta.key] ?? 0;
          const next = Math.max(cur, xpVal);
          return { ...prev, [worldMeta.key]: next };
        });

      // Last on‑chain fijo + history
      setLastOnchain({ world: worldId || undefined, p: 10 + buffP, d: 10 + buffD, xp: xpVal });
      if (worldId) {
        setHistory((h) => {
          const item = { ts: Date.now(), w: worldId, p: 10 + buffP, d: 10 + buffD, xp: xpVal };
          return [item, ...h].slice(0, 3);
        });
      }

      // Indicador pegajoso SOLO post‑TX
      if (showIndicator) {
        const p = 10 + buffP,
          d = 10 + buffD;
        const msg = `On‑chain ✔ WORLD=${worldId || "?"} • P=${p} (${buffP >= 0 ? "+" : ""}${buffP}) • D=${d} (${
          buffD >= 0 ? "+" : ""
        }${buffD}) • XP=${xpVal}`;
        setSyncMsg(msg);
        setSyncVisible(true);
        setTimeout(() => setSyncVisible(false), 25000);
      }
    } catch (e) {
      console.warn("refreshFromTokenURI error", e);
    }
  }

  // Carga inicial desde tokenURI
  useEffect(() => {
    refreshFromTokenURI(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pcAthens, address]);

  // Escuchar evento post‑viaje y refrescar tokenURI + totales por chain
  useEffect(() => {
    function onSync() {
      refreshFromTokenURI(true);
      if (address) refreshPlayerTotals(address); // ETH/Polygon/BNB
    }
    window.addEventListener("zq:sync", onSync);
    return () => window.removeEventListener("zq:sync", onSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pcAthens, address]);

  // Re-chequea NFT al enfocar pestaña o tras minteo (evento zq:minted)
  useEffect(() => {
    function onFocus() {
      if (address && NFT_ADDRESS) {
        setCheckingNft(true);
        refreshFromTokenURI(false).finally(() => setCheckingNft(false));
      }
    }
    function onMinted() {
      if (address) {
        setCheckingNft(true);
        refreshFromTokenURI(true).finally(() => setCheckingNft(false));
      }
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("zq:minted", onMinted);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("zq:minted", onMinted);
    };
  }, [address]);

  // Escuchar evento de animación de viaje
  useEffect(() => {
    function onTravelDone(e: any) {
      const world: number | undefined = e?.detail?.world;
      const src = world ? TRAVEL_SPRITE_BY_WORLD[world] : undefined;
      if (!src) return;
      setTravelAnim({ visible: true, src });
      setTimeout(() => setTravelAnim({ visible: false, src: "" }), 1600);
    }
    window.addEventListener("zq:travel:done", onTravelDone);
    return () => window.removeEventListener("zq:travel:done", onTravelDone);
  }, []);

  /* ------- Quests (IA Gemini) ------- */
  async function newQuest() {
    try {
      // Vamos directo a Gemini (tu endpoint existente)
      const r2 = await fetch("/api/quests/new", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ world: selectedWorld }),
      });
      const j2 = await safeJson(r2);
      if (j2?.quest) {
        setQuest({ ...(j2.quest as any), amount: j2.quest?.amount ?? 10 });
        return;
      }
      throw new Error("No quest returned");
    } catch {
      setQuest({
        title: "Offline Quest",
        objectives: ["Try again later", "Keep exploring", "Have fun"],
        status: "active",
        amount: 10,
      } as any);
    }
  }

  async function rerollQuest() {
    await newQuest();
  }

  async function completeQuest() {
    if (!quest || !address || isCompleting) return;

    const amount = (quest as any).amount ?? 10;
    setIsCompleting(true);

    // Sello visual 1s pero sin bloquear la misión
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 1000);

    try {
      const r = await fetch("/api/quests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          player: address,
          amount,
          title: quest.title,
        }),
      });

      // parseo tolerante
      const ct = r.headers.get("content-type") || "";
      let payload: any = null;
      if (ct.includes("application/json")) {
        payload = await r.json();
      } else {
        const txt = await r.text();
        payload = { error: txt.slice(0, 500) };
      }

      console.log("completeQuest payload:", payload);

      const success = payload?.ok === true || (payload?.newTotal && isFinite(Number(payload.newTotal)));
      if (!r.ok || !success) {
        console.warn("addXp failed:", payload?.error || "unknown");
        alert(`XP failed:\n${payload?.error ?? r.statusText}`);
        return;
      }

      // ⬆️ Actualiza HUD inmediatamente con el total global (se refleja en todas las chains)
      setXpByChain((prev) => {
        const next = Number(payload?.newTotal);
        if (Number.isFinite(next)) {
          return { ethereum: next, polygon: next, bnb: next };
        }
        const inc = amount ?? 0;
        return {
          ethereum: (prev.ethereum ?? 0) + inc,
          polygon: (prev.polygon ?? 0) + inc,
          bnb: (prev.bnb ?? 0) + inc,
        };
      });

      // Re‑sync adicional (tokenURI/historial, sin bajar valores por Math.max)
      setTimeout(() => window.dispatchEvent(new Event("zq:sync")), 1200);

      // animación
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 1100);
    } catch (e: any) {
      console.warn("addXp error:", e?.message || e);
      alert(`XP error:\n${e?.message ?? String(e)}`);
    } finally {
      setIsCompleting(false);
    }
  }

  /* ====== UI ====== */
  return (
    <main className="relative min-h-screen text-white">
      <PixelBG />

      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between">
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
      <section className="mx-auto max-w-6xl px-4">
        <HoloCard>
          <div className="grid gap-3 md:grid-cols-[1.1fr_1.1fr_1.1fr_auto] p-3 items-start">
            {/* NFT */}
            <div className="flex items-center gap-3 rounded-xl p-3">
              <div className="relative h-20 w-20 overflow-hidden rounded-lg ring-1 ring-white/10">
                <Image src={nftImage ?? ART.traveler} alt="nft" fill className="object-cover" unoptimized />
              </div>
              <div className="text-xs">
                <div className="font-pixel">NFT</div>
                <div className="opacity-80">{nftRarity ? `Traveler • ${nftRarity}` : "Traveler"}</div>
              </div>
            </div>

            {/* WORLD */}
            <div className="flex items-center gap-3 rounded-xl p-3">
              <Image src={CHAIN_BUFFS[chain].icon} alt="world" width={45} height={45} />
              <div className="text-xs">
                <div className="font-pixel">WORLD</div>
                <div className="opacity-80 capitalize">{CHAIN_BUFFS[chain].label}</div>
              </div>
            </div>

            {/* BUFF */}
            <div className="flex items-center gap-3 rounded-xl p-3">
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
            <div className="relative flex flex-col items-end text-right">
              {/* pill tooltip */}
              <div className="absolute -top-1 -right-2">
                <div className="rounded-lg bg-white/10 border border-white/15 px-2 py-[2px] text-[10px] leading-tight whitespace-nowrap backdrop-blur-sm">
                  <span className="opacity-80">ZetaPoints</span>
                  <span className="mx-1 opacity-50">=</span>
                  <span className="opacity-80">XP</span>
                  <span className="mx-1 opacity-50">×</span>
                  <span className="opacity-80">buff</span>
                </div>
              </div>

              {/* wrapper con margin-top */}
              <div className="mt-3 flex flex-col items-end gap-1">
                {/* número grande */}
                <div className="font-pixel text-2xl leading-none drop-shadow-[0_1px_0_rgba(0,0,0,.6)]">
                  {stats.xpChain}
                </div>

                {/* iconos */}
                <div className="mt-1 flex items-center gap-2 opacity-90">
                  <Image src={ART.coin} alt="coin" width={38} height={38} />
                  <Image src={CHAIN_BUFFS[chain].icon} alt="network" width={38} height={38} />
                </div>

                {/* total */}
                <div className="text-[10px] opacity-70 mt-1">Total: {stats.total}</div>
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

      {/* CTA: no NFT */}
      {hasNft === false && (
        <div className="mx-auto max-w-6xl px-4 mt-3">
          <div className="rounded-xl border border-white/15 bg-white/5 p-4 flex items-center justify-between">
            <div className="text-sm opacity-90">
              You don’t have a Traveler yet. Mint one to start earning XP and ZetaPoints.
              {checkingNft && <span className="ml-2 text-xs opacity-70">Checking…</span>}
            </div>
            <a href="/mint" className="font-press px-4 py-2 rounded-xl bg-cyan-400 text-black hover:brightness-110">
              Mint your Traveler
            </a>
          </div>
        </div>
      )}

      {/* Cuerpo */}
      <section className="mx-auto max-w-6xl p-4 grid md:grid-cols-3 gap-6 mt-4">
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
                <div className="text-[10px] opacity-70">ZetaPoints</div>
                <div className="font-pixel text-xl">{stats.xpChain}</div>
                <div className="text-[10px] opacity-60 mt-1">Total: {stats.total}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Image src={CHAIN_BUFFS[chain].icon} alt={CHAIN_BUFFS[chain].label} width={18} height={18} />
              <div className="text-sm">
                Wold: <span className="font-pixel capitalize">{CHAIN_BUFFS[chain].label}</span>
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
                          setChain(w.key); // UX adelantada
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

              {/* BOTÓN TRAVEL al destino seleccionado */}
              <div className="flex">
                <div className="w-full">
                  <TravelButton key={`${address ?? "no"}-${selectedWorld}`} dstChainId={selectedWorld} />
                </div>
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
                  {justCompleted && <Image src={ART.quest} alt="Quest Complete" width={160} height={42} unoptimized />}
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
                  <button
                    onClick={completeQuest}
                    disabled={isCompleting}
                    className="font-press px-4 py-3 rounded-xl bg-emerald-400 text-black hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCompleting ? "Completing..." : `Complete Quest (+${(quest as any)?.amount ?? 10} XP)`}
                  </button>
                  <button
                    onClick={rerollQuest}
                    className="font-press px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15"
                  >
                    New Gemini Quest
                  </button>
                </div>

                {/* Mainnet Badge block */}
                <MainnetBadge worldId={lastOnchain?.world ?? selectedWorld} xpSnapshot={stats.total} />
              </div>
            )}
          </div>
        </HoloCard>
      </section>

      {/* Overlay LEVEL UP */}
      {showLevelUp && (
        <div className="pointer-events-none fixed inset-0 grid place-items-center z-[90]">
          <Image src={ART.levelup} alt="LEVEL UP" width={420} height={120} className="animate-[fade_1.1s_ease-out]" />
        </div>
      )}

      {/* Overlay TRAVEL BURST */}
      {travelAnim.visible && (
        <div className="pointer-events-none fixed inset-0 grid place-items-center z-[80]">
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

      <OnboardingModal />

      <style>{`
        @keyframes fade {
          0% { opacity: 0; transform: scale(0.95); }
          10% { opacity: 1; transform: scale(1.02); }
          90% { opacity: 1; }
          100% { opacity: 0; transform: scale(1); }
        }
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
