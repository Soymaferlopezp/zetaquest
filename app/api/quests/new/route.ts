// app/api/quests/new/route.ts
import { NextResponse } from "next/server";

type Quest = { title: string; objectives: string[]; status: "active" | "completed" };

const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- Temas por chain (tono + vocabulario)
const CHAIN_THEMES: Record<
  string,
  { lore: string; verbs: string[]; nouns: string[] }
> = {
  ethereum: {
    lore:
      "Prime hub of cross-chain research. Security-first, canonical bridges, rollups, and sequencers.",
    verbs: ["synchronize", "audit", "stabilize", "trace", "attest"],
    nouns: ["rollup sequencer", "L1 beacon", "canonical bridge", "Merkle root"],
  },
  polygon: {
    lore:
      "High-throughput side realms. ZK-powered lanes, fast settlement, and efficient data proofs.",
    verbs: ["optimize", "prove", "compress", "aggregate", "calibrate"],
    nouns: ["ZK circuit", "aggregator", "state proof", "validity commitment"],
  },
  bnb: {
    lore:
      "Expedition corridor for explorers. Liquidity routes, staking relays, and MEV beacons.",
    verbs: ["route", "stake", "reroute", "deflect", "balance"],
    nouns: ["relay", "staking vault", "liquidity channel", "MEV sensor"],
  },
};

// --- Fallback por si falla Gemini
function fallbackQuest(chainKey?: string): Quest {
  const base = CHAIN_THEMES[chainKey || "ethereum"] ?? CHAIN_THEMES.ethereum;
  const pick = [
    {
      title: "Calibrate the Cross-Chain Relay",
      objectives: [
        "Scan beacon latency across two networks",
        "Stabilize the relay oscillator",
        "Broadcast a synced heartbeat message",
      ],
    },
    {
      title: "Seal the Proof Channel",
      objectives: [
        "Collect three state roots from recent blocks",
        "Verify commitment integrity on the hub",
        "Finalize the proof and publish receipt",
      ],
    },
    {
      title: "Reroute the Liquidity Stream",
      objectives: [
        "Trace slippage across the corridor",
        "Rebalance the vault thresholds",
        "Confirm safe passage with a test swap",
      ],
    },
  ];
  const q = pick[Math.floor(Math.random() * pick.length)];
  return { ...q, status: "active" as const };
}

async function questFromGemini(
  chainKey?: string,
  chainLabel?: string
): Promise<Quest | null> {
  if (!GEMINI_API_KEY) return null;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const theme = CHAIN_THEMES[chainKey || "ethereum"] ?? CHAIN_THEMES.ethereum;

  // Prompt: inglés, travel + web3, nada infantil
  const prompt = `
You generate a short, stylish travel-themed web3 quest for a pixel-art sci‑fi game called "ZetaQuest".
Language: English. Tone: concise, technical-adventurous. No emojis. No childish or pet content.
Write strict JSON ONLY (no code fences). Shape:

{
  "title": "string (max 60 chars)",
  "objectives": ["string", "string", "string"]
}

Constraints:
- Exactly 3 objectives.
- Each objective: 6–12 words, imperative mood.
- Use web3/scalability terms appropriately (proofs, bridges, rollups).
- Keep it chain-aware:

CHAIN CONTEXT:
- Current chain label: ${chainLabel || "Ethereum"}
- Lore: ${theme.lore}
- Suggested verbs: ${theme.verbs.join(", ")}
- Suggested nouns: ${theme.nouns.join(", ")}

The quest should feel like traveling between realms, syncing systems, or stabilizing cross‑chain routes.
Examples of good verbs: Align, Validate, Route, Seal, Rebalance, Calibrate, Synchronize, Prove.
Avoid childish themes like pets or toy robots. Focus on exploration, systems, and proofs.
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 220,
      responseMimeType: "application/json",
    },
  });

  const text = result.response.text();
  try {
    const data = JSON.parse(text) as { title?: string; objectives?: string[] };
    if (
      typeof data?.title === "string" &&
      Array.isArray(data?.objectives) &&
      data.objectives.length === 3 &&
      data.objectives.every((o) => typeof o === "string" && o.trim().length > 0)
    ) {
      // Post-procesado suave: recorte y mayúscula inicial
      const clean = (s: string) =>
        s.trim().replace(/\s+/g, " ").replace(/^([a-z])/, (m) => m.toUpperCase()).slice(0, 120);
      return {
        title: clean(data.title).slice(0, 60),
        objectives: data.objectives.map(clean).slice(0, 3),
        status: "active",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // body opcional: { worldId?: number, chainKey?: "ethereum"|"polygon"|"bnb", chainLabel?: string }
    const body = await req.json().catch(() => ({}));
    const chainKey = (body?.chainKey as string | undefined)?.toLowerCase();
    const chainLabel = body?.chainLabel as string | undefined;

    const aiQuest = await questFromGemini(chainKey, chainLabel);
    const quest: Quest = aiQuest ?? fallbackQuest(chainKey);

    return NextResponse.json({ ok: true, quest, ai: !!aiQuest });
  } catch (err: any) {
    console.error("quests/new error:", err?.message || err);
    return NextResponse.json({ ok: true, quest: fallbackQuest(), ai: false });
  }
}
