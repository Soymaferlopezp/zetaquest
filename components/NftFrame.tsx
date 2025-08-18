"use client";
import Image from "next/image";

export default function NftFrame({
  src, rarity = "Normal", progress = 42, // 0..100
}: { src: string; rarity?: "Normal"|"Rare"|"Epic"; progress?: number; }) {

  const badge = {
    Normal: "bg-white/10 border-white/20",
    Rare: "bg-indigo-400 text-black",
    Epic: "bg-amber-300 text-black"
  }[rarity];

  const ring = `conic-gradient(var(--accent, #7dd3fc) ${progress}%, rgba(255,255,255,.08) ${progress}% 100%)`;

  return (
    <div className="relative grid place-items-center">
      {/* Anillo */}
      <div className="relative h-48 w-48 rounded-full p-1"
        style={{ background: ring }}>
        <div className="h-full w-full rounded-full bg-black grid place-items-center">
          <div className="relative h-40 w-40">
            <Image src={src} alt="NFT" fill className="object-contain" unoptimized />
          </div>
        </div>
      </div>

      {/* Badge de rareza */}
      <div className={`absolute -bottom-2 px-3 py-1 text-[10px] rounded-full border ${badge}`}>
        {rarity}
      </div>
    </div>
  );
}
