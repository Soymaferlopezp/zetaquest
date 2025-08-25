"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "zq:onboarding:v2"; 

export default function OnboardingModal() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Detecta ?onboarding=1 en la URL para forzar el modal
  const forceFromQuery = useMemo(() => {
    if (typeof window === "undefined") return false;
    const u = new URL(window.location.href);
    return u.searchParams.get("onboarding") === "1";
  }, []);

  useEffect(() => {
    setMounted(true);

    // Atajo: tecla "o" → abrir modal (debug / demo)
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "o") setVisible(true);
    };
    window.addEventListener("keydown", onKey);

    try {
      // Si viene forzado por query param, mostrar sí o sí
      if (forceFromQuery) {
        setVisible(true);
      } else {
        // Si no está marcada la preferencia, mostrar
        const flag = localStorage.getItem(STORAGE_KEY);
        setVisible(flag !== "1");
      }
    } catch {
      setVisible(true);
    }

    return () => window.removeEventListener("keydown", onKey);
  }, [forceFromQuery]);

  const close = () => setVisible(false);
  const dontShowAgain = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Botón flotante de ayuda (quítalo en prod si quieres) */}
      {!visible && (
        <button
          onClick={() => setVisible(true)}
          className="fixed bottom-3 right-3 z-[90] text-xs px-3 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15"
          title='Press "o" to open'
        >
          Open help
        </button>
      )}

      {visible && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative max-w-lg mx-auto mt-24 rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] px-2 py-[2px] rounded-full bg-cyan-400/30 border border-cyan-300/40 uppercase tracking-wider">
                Welcome
              </span>
              <div className="font-pixel text-lg">How to play ZetaQuest</div>
            </div>

            <ol className="text-sm space-y-2 opacity-90">
              <li>1) Connect your wallet.</li>
              <li>2) Travel on-chain to a world (Polygon / BNB / Ethereum testnets).</li>
              <li>3) Click “New Gemini Quest” to get a mission.</li>
              <li>4) Complete the quest → earn XP → watch the HUD + NFT update.</li>
              <li>5) (Optional) Switch to ZetaChain Mainnet and “Mint Mainnet Badge”.</li>
            </ol>

            <div className="mt-5 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs opacity-80 select-none">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      dontShowAgain(); // guarda y cierra
                    } else {
                      try { localStorage.removeItem(STORAGE_KEY); } catch {}
                    }
                  }}
                />
                Don’t show again
              </label>

              <div className="flex gap-2">
                <button
                  onClick={close}
                  className="font-press px-4 py-2 rounded-xl bg-cyan-400 text-black hover:brightness-110"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
