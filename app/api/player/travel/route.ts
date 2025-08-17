export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type ChainKey = "ethereum" | "polygon" | "bnb";
const globalAny = globalThis as any;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const chain = (body?.chain ?? "").toLowerCase();
  if (!["ethereum", "polygon", "bnb"].includes(chain)) {
    return NextResponse.json({ error: "invalid chain" }, { status: 400 });
  }

  const c = await cookies(); 
  let id = c.get("zqid")?.value;
  if (!id) return NextResponse.json({ error: "no player" }, { status: 400 });

  const store: Map<string, any> = globalAny.__zqStore?.players;
  const player = store?.get(id);
  if (!player) return NextResponse.json({ error: "player not found" }, { status: 404 });

  player.chain = chain as ChainKey;
  store.set(id, player);
  return NextResponse.json({ player });
}
