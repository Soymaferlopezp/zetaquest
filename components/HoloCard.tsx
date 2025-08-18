// components/HoloCard.tsx
"use client";
import { PropsWithChildren } from "react";

export default function HoloCard({
  children,
  className = "",
  variant = "solid", // "solid" (con borde sutil) | "soft" (sin borde visible)
}: PropsWithChildren<{ className?: string; variant?: "solid" | "soft" }>) {
  const baseInner = "relative rounded-2xl bg-black/45 backdrop-blur-sm";

  return (
    <div className={`relative rounded-2xl ${className}`}>
      <div
        className={
          variant === "soft"
            // sin borde; solo glass + rayitas + sombra interior muy suave
            ? `${baseInner} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.35)]`
            // borde sutil (para HUD/landing si quieres)
            : `${baseInner} border border-white/12`
        }
      >
        {/* Rayitas internas muy suaves */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.06]"
          style={{
            background:
              "repeating-linear-gradient(45deg, rgba(255,255,255,1) 0 6px, transparent 6px 18px)",
          }}
        />
        <div className="relative rounded-2xl">{children}</div>
      </div>
    </div>
  );
}


