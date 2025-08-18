"use client";
export default function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Estrellas */}
      <div className="absolute inset-0 animate-twinkle opacity-30" style={{
        backgroundImage:
          "radial-gradient(1px 1px at 20% 30%, white 50%, transparent 51%)," +
          "radial-gradient(1px 1px at 80% 20%, white 50%, transparent 51%)," +
          "radial-gradient(1px 1px at 60% 70%, white 50%, transparent 51%)," +
          "radial-gradient(1.5px 1.5px at 30% 80%, white 50%, transparent 51%)," +
          "radial-gradient(1px 1px at 90% 60%, white 50%, transparent 51%)"
      }} />
      {/* Aurora */}
      <div className="absolute -inset-[20%] blur-3xl opacity-[0.17] animate-aurora"
        style={{
          background:
            "conic-gradient(from 90deg, var(--accent, #7dd3fc), transparent 30%, var(--accent, #7dd3fc) 60%, transparent 80%)"
        }}
      />
      {/* Grilla sutil */}
      <div className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,.08) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(255,255,255,.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />
      {/* Viñeta */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,.35)_60%,rgba(0,0,0,.8)_100%)]" />
      <style>{`
        @keyframes twinkle { 
          0%,100% { opacity: .25 } 50% { opacity: .4 } 
        }
        .animate-twinkle { animation: twinkle 6s ease-in-out infinite; }
        @keyframes aurora {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(20deg) scale(1.1); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .animate-aurora { animation: aurora 14s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
