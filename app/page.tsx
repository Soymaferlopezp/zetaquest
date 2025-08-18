"use client";

import Image from "next/image";
import Link from "next/link";
import WalletConnect from "../components/wallet-connect";
import BackgroundFX from "../components/BackgroundFX";
import HoloCard from "../components/HoloCard";

const ART = {
  bgHero: "/art/bg-1.png",
  bgMission: "/art/bg-2.png",
  travelerIdle: "/art/idle.gif",
  espada: "/art/espada.png",
  escudo: "/art/escudo.png",
  warp: "/art/warp.png",
  eth: "/art/eth.png",
  polygon: "/art/polygon.png",
  bnb: "/art/bnb.png",
  coin: "/art/coin.png",
  questComplete: "/art/quest-complete.png",
  levelup: "/art/levelup.png",
  onlyconfetti: "/art/onlyconfetti.png",
};

export default function Page() {
  return (
    <main className="relative min-h-screen text-white">
    <BackgroundFX />
      {/* NAV */}
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 z-50 bg-black/70 backdrop-blur">
        <Link href="/" className="font-pixel text-xl tracking-wide">ZetaQuest</Link>
        <nav className="hidden md:flex items-center gap-6 text-xs opacity-80">
          <a href="#how" className="hover:opacity-100">Cómo funciona</a>
          <a href="#buffs" className="hover:opacity-100">Buffs</a>
          <a href="#stack" className="hover:opacity-100">Stack</a>
          <a href="#faq" className="hover:opacity-100">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <WalletConnect redirectToOnConnect="/after-connect" />
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-12 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="font-pixel text-4xl md:text-6xl leading-tight">
              Tu NFT. Tus misiones. <span className="text-cyan-400">Cross-chain</span>.
            </h1>
            <p className="mt-4 text-slate-300 text-sm md:text-base">
              Un RPG-lite donde viajas entre blockchains con tu NFT, obtienes <em>buffs</em> por cadena
              y completas misiones generadas por IA sobre ZetaChain.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/app" className="font-press px-4 py-2 rounded-lg bg-cyan-400 text-black hover:brightness-110 transition">
                Empezar
              </a>
              <a href="#how" className="font-press px-4 py-2 rounded-lg border border-white/25 hover:bg-white/10 transition">
                Ver cómo funciona
              </a>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <Image src={ART.warp} alt="Warp" width={18} height={18} /> Universal Smart Contracts
              </span>
              <span className="inline-flex items-center gap-2">
                <Image src={ART.coin} alt="Z" width={18} height={18} /> ZetaPoints & badges
              </span>
            </div>
          </div>

          {/* Artwork */}
          <div className="relative">
            <div className="relative w-full aspect-[4/3] rounded-3xl ring-1 ring-white/10 overflow-hidden">
              <Image src={ART.bgHero} alt="World" fill className="object-cover opacity-70" />
              <Image
                src={ART.travelerIdle}
                alt="Traveler"
                width={400}
                height={400}
                className="absolute bottom-0 right-12 drop-shadow-[0_0_35px_rgba(34,211,238,0.35)]"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* DIVISOR PIXEL */}
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="h-[10px] w-full bg-white/5 rounded-full overflow-hidden">
          <Image src={ART.onlyconfetti} alt="pixels" width={1200} height={10} className="w-full h-full object-cover opacity-50" />
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-pixel text-2xl md:text-3xl">Cómo funciona</h2>
        <p className="mt-2 text-slate-300 text-sm">Dashboard + tablero de misiones. Simple, limpio, pixel vibes.</p>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <Feature
            icon={ART.espada}
            title="Mintea tu NFT"
            desc="1 por jugador. Stats base (rarity/power/defense)."
          />
          <Feature
            icon={ART.warp}
            title="Travel cross-chain"
            desc="Cambia de cadena y recibe buffs dinámicos visibles."
          />
          <Feature
            icon={ART.escudo}
            title="Completa misiones"
            desc="Objetivos generados por IA, gana ZetaPoints e insignias."
          />
        </div>
      </section>

      {/* BUFFS */}
      <section id="buffs" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-pixel text-2xl md:text-3xl">Buffs por blockchain (demo)</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <BuffCard icon={ART.eth} chain="Ethereum" buff="+10% Power" />
          <BuffCard icon={ART.polygon} chain="Polygon" buff="+15% Defense" />
          <BuffCard icon={ART.bnb} chain="BNB Chain" buff="+20% XP gain" />
        </div>
      </section>

      {/* STACK */}
      <section id="stack" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-pixel text-2xl md:text-3xl">Stack técnico</h2>
        <ul className="mt-4 grid md:grid-cols-2 gap-2 text-sm text-slate-300 list-disc list-inside">
          <li><span className="font-press">Frontend:</span> Next.js 14 + Tailwind (modo pixel)</li>
          <li><span className="font-press">Backend:</span> API Routes (Node runtime)</li>
          <li><span className="font-press">Smart Contracts:</span> ZetaChain USC + ERC-721 dinámico</li>
          <li><span className="font-press">DB:</span> SQLite (demo) / Postgres (prod)</li>
          <li><span className="font-press">IA:</span> Google Gemini (quests JSON)</li>
        </ul>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-8 text-center">
          <h3 className="font-pixel text-2xl md:text-3xl">¿Listx para tu primera misión?</h3>
          <p className="mt-2 text-slate-300 text-sm">Conecta tu wallet, mintea tu NFT y viaja entre cadenas.</p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/app" className="font-press px-4 py-2 rounded-lg bg-cyan-400 text-black hover:brightness-110 transition">
              Abrir Dashboard
            </a>
            <a href="#faq" className="font-press px-4 py-2 rounded-lg border border-white/25 hover:bg-white/10 transition">
              Preguntas frecuentes
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER / FAQ */}
      <footer id="faq" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div>
            <div className="font-pixel text-slate-200">ZetaQuest</div>
            <p className="mt-2">Demo educativa que muestra el poder de ZetaChain: misiones con IA + buffs cross-chain.</p>
          </div>
          <div>
            <div className="font-pixel text-slate-200">FAQ</div>
            <ul className="mt-2 space-y-1">
              <li>¿El NFT es real? — Sí, ERC-721 dinámico en testnet.</li>
              <li>¿Las misiones son on-chain? — La narrativa es off-chain; recompensas opcional on-chain.</li>
              <li>¿Datos guardados? — SQLite local / Postgres en producción.</li>
            </ul>
          </div>
          <div>
            <div className="font-pixel text-slate-200">Contacto</div>
            <p className="mt-2">X / GitHub.</p>
          </div>
        </div>
        <div className="text-center text-[10px] text-slate-500 pb-8">© 2025 ZetaQuest. All rights reserved.</div>
        <div className="text-center text-[10px] text-slate-500 pb-8">Hecho con ♥ desde Web3.</div>
      </footer>
    </main>
  );
}

/* --- Mini componentes inline para mantener 1 solo archivo --- */

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <Image src={icon} alt="" width={24} height={24} />
        <div className="font-pixel text-lg">{title}</div>
      </div>
      <p className="mt-2 text-xs text-slate-300">{desc}</p>
    </div>
  );
}

function BuffCard({ icon, chain, buff }: { icon: string; chain: string; buff: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-5 flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-400">{chain}</div>
        <div className="font-pixel text-xl">{buff}</div>
      </div>
      <Image src={icon} alt={chain} width={28} height={28} />
    </div>
  );
}
