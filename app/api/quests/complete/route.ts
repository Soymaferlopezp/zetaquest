import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { zetaAthens, zetaRpc } from "../../../lib/zeta";
import { SCORE_V2_ABI } from "../../../lib/abi/scoreV2";

const SCORE_V2_ADDRESS = process.env.SCORE_V2_ADDRESS as `0x${string}`;
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY as `0x${string}`;

export async function POST(req: Request) {
  try {
    const { player, amount } = await req.json();

    if (!player || !amount) {
      return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
    }

    // Server wallet
    const account = privateKeyToAccount(SERVER_PRIVATE_KEY);
    const client = createWalletClient({
      account,
      chain: zetaAthens,
      transport: http(zetaRpc),
    });

    // Llamada a addXp en ScoreV2
    const hash = await client.writeContract({
      address: SCORE_V2_ADDRESS,
      abi: SCORE_V2_ABI,
      functionName: "addXp",
      args: [player as `0x${string}`, BigInt(amount)],
    });

    return NextResponse.json({ ok: true, tx: hash });
  } catch (err: any) {
    console.error("addXp error", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
