// components/PixelBG.tsx
"use client";

export default function PixelBG() {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Fondo del landing */}
      <img
        src="/art/bg-2.png"
        alt="bg"
        className="h-full w-full object-cover"
      />
      {/* Rayitas diagonales muy sutiles */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        aria-hidden
        style={{
          background:
            "repeating-linear-gradient( 45deg, rgba(255,255,255,1) 0 6px, transparent 6px 18px )",
        }}
      />
      {/* Viñeta para foco */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_60%,rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
}
