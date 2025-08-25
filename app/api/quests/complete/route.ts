import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  fallback,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { zetachainAthensTestnet } from "viem/chains";

const abi = parseAbi([
  "function xpOf(address) view returns (uint256)",
  "function addXpAndLog(address player, uint256 amount, string title)"
]);

// 1) Construye lista de RPCs (usa el tuyo + los públicos que ya tienes en .env)
const rpcMain = process.env.RPC_ATHENS || "";
const extraList =
  (process.env.NEXT_PUBLIC_ZETA_RPC_LIST || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

const RPCS = [
  ...new Set(
    [rpcMain,
     "https://zetachain-testnet.public.blastapi.io",
     "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
     "https://zetachain-testnet-evm.itrocket.net",
     ...extraList
    ].filter(Boolean)
  )
];

// 2) Fallback transport con ranking y reintentos
const transport = RPCS.length > 1
  ? fallback(
      RPCS.map(u => http(u, { timeout: 15_000 })),
      { rank: true, retryCount: 2, retryDelay: 300 }
    )
  : http(RPCS[0], { timeout: 15_000 });

const CONTRACT =
  (process.env.SCORE_V2_ADDRESS ||
    process.env.SCORE_ADDRESS ||
    process.env.ZETAQUEST_SCORE_ADDRESS) as `0x${string}`;

const PK = process.env.SERVER_PRIVATE_KEY!;

export async function POST(req: Request) {
  try {
    const { player, amount, title } = await req.json();
    if (!player || amount == null || !title) {
      return NextResponse.json({ ok: false, error: "Missing player/amount/title" }, { status: 400 });
    }

    const account = privateKeyToAccount(PK as `0x${string}`);

    const publicClient = createPublicClient({
      chain: zetachainAthensTestnet,
      transport,
    });
    const walletClient = createWalletClient({
      account,
      chain: zetachainAthensTestnet,
      transport,
    });

    const cid = await publicClient.getChainId();
    const bal = await publicClient.getBalance({ address: account.address });
    console.log("ZQ /complete → CHAIN:", cid, "CONTRACT:", CONTRACT, "SIGNER:", account.address);
    console.log("ZQ /complete → balance(wei):", bal.toString());
    console.log("ZQ /complete → RPCS:", RPCS.join(" | "));

    // Intento A: write directo (deja que el nodo estime)
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT,
        abi,
        functionName: "addXpAndLog",
        args: [player as `0x${string}`, BigInt(amount), String(title).slice(0, 96)],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const newTotal = await publicClient.readContract({
        address: CONTRACT,
        abi,
        functionName: "xpOf",
        args: [player as `0x${string}`],
      });
      return NextResponse.json({ ok: true, txHash: hash, status: receipt.status, newTotal: newTotal.toString() });
    } catch (e1: any) {
      console.warn("ZQ /complete A (direct) failed:", e1?.shortMessage || e1?.message || e1);
      // Intento B: legacy gas
      const gasPrice = await publicClient.getGasPrice().catch(() => 1_000_000_000n);
      const hash = await walletClient.writeContract({
        address: CONTRACT,
        abi,
        functionName: "addXpAndLog",
        args: [player as `0x${string}`, BigInt(amount), String(title).slice(0, 96)],
        // usar legacy (gasPrice) y gas fijo por si el nodo no estima bien
        gas: 180_000n,
        gasPrice,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const newTotal = await publicClient.readContract({
        address: CONTRACT,
        abi,
        functionName: "xpOf",
        args: [player as `0x${string}`],
      });
      return NextResponse.json({ ok: true, txHash: hash, status: receipt.status, newTotal: newTotal.toString() });
    }
  } catch (err: any) {
    const msg = err?.shortMessage || err?.message || "Unknown error";
    const data =
      err?.data ? (typeof err.data === "string" ? err.data : JSON.stringify(err.data)) : undefined;
    console.error("ZQ /complete ERROR (final):", msg, data);
    return NextResponse.json({ ok: false, error: msg, data }, { status: 500 });
  }
}
