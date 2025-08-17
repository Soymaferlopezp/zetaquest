export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type ChainKey = "ethereum" | "polygon" | "bnb";
type Player = {
  id: string; // address o cookie-id
  chain: ChainKey;
  xpByChain: Record<ChainKey, number>;
  power: number;
  defense: number;
};

const globalForStore = globalThis as unknown as { __zqStore?: { players: Map<string, Player> } };
if (!globalForStore.__zqStore) globalForStore.__zqStore = { players: new Map() };
const store = globalForStore.__zqStore.players;

function createPlayer(id: string): Player {
  return {
    id,
    chain: "ethereum",
    xpByChain: { ethereum: 0, polygon: 0, bnb: 0 },
    power: 10,
    defense: 10,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addressParam = url.searchParams.get("address")?.toLowerCase() || null;

  const c = await cookies();
  const cookieId = c.get("zqid")?.value || null;

  // Si viene address => usarla como ID y migrar progreso desde cookie (si existía)
  if (addressParam) {
    const addr = addressParam as string;

    // jugador base por address
    let addrPlayer = store.get(addr) ?? createPlayer(addr);

    // si había cookieId distinto, mergear y limpiar
    if (cookieId && cookieId !== addr) {
      const cookiePlayer = store.get(cookieId);
      if (cookiePlayer) {
        addrPlayer.xpByChain = {
          ethereum: addrPlayer.xpByChain.ethereum + cookiePlayer.xpByChain.ethereum,
          polygon: addrPlayer.xpByChain.polygon + cookiePlayer.xpByChain.polygon,
          bnb: addrPlayer.xpByChain.bnb + cookiePlayer.xpByChain.bnb,
        };
        addrPlayer.chain = cookiePlayer.chain ?? addrPlayer.chain;
        store.delete(cookieId);
      }
    }

    store.set(addr, addrPlayer);

    const res = NextResponse.json({ player: addrPlayer, created: !store.has(addr) });
    // fija cookie al address para que el resto de endpoints lo lean
    res.cookies.set("zqid", addr, { path: "/", httpOnly: false, sameSite: "lax" });
    return res;
  }

  // Sin address: fallback por cookie (o crea uno nuevo)
  let id = cookieId;
  if (!id) {
    id = `zq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const p = createPlayer(id);
    store.set(id, p);
    const res = NextResponse.json({ player: p, created: true });
    res.cookies.set("zqid", id, { path: "/", httpOnly: false, sameSite: "lax" });
    return res;
  }

  let player = store.get(id);
  if (!player) {
    player = createPlayer(id);
    store.set(id, player);
  }
  return NextResponse.json({ player, created: false });
}
