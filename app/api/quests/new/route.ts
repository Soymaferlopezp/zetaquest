export const runtime = "nodejs";
import { NextResponse } from "next/server";

function randomQuest() {
  const pool = [
    {
      title: "First Steps Between Chains",
      objectives: ["Connect your wallet", "Travel to another chain", "View updated stats"],
    },
    {
      title: "Pixel Pioneer",
      objectives: ["Open the Dashboard", "Switch chain twice", "Share your ZetaPoints"],
    },
    {
      title: "Warp Runner",
      objectives: ["Mint your NFT", "Visit Polygon", "Visit BNB Chain"],
    },
  ];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { ...pick, status: "active" as const };
}

export async function POST() {
  // más adelante, si quieres, leemos address/seed del body
  const quest = randomQuest();
  return NextResponse.json({ quest });
}
