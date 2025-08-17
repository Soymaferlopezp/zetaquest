export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const globalAny = globalThis as any;

export async function POST(req: Request) {
  const { chain, delta } = await req.json().catch(() => ({}));
  if (!["ethereum", "polygon", "bnb"].includes(String(chain))) {
    return NextResponse.json({ error: "invalid chain" }, { status: 400 });
  }
  const d = Number(delta ?? 0);
  if (!Number.isFinite(d)) {
    return NextResponse.json({ error: "invalid delta" }, { status: 400 });
  }

  const c = await cookies();
  let id = c.get("zqid")?.value;
  if (!id) return NextResponse.json({ error: "no player" }, { status: 400 });

  const store: Map<string, any> = globalAny.__zqStore?.players;
  const player = store?.get(id);
  if (!player) return NextResponse.json({ error: "player not found" }, { status: 404 });

  player.xpByChain[chain] += d;
  store.set(id, player);

  const total = player.xpByChain.ethereum + player.xpByChain.polygon + player.xpByChain.bnb;
  return NextResponse.json({ ok: true, player, total });
}
