// app/api/quests/new/route.ts
import { NextResponse } from "next/server";

const WORLDS: Record<number, { key: "ethereum"|"polygon"|"bnb"; name: string }> = {
  11155111: { key: "ethereum", name: "Ethereum Sepolia" },
  80002:    { key: "polygon",  name: "Polygon Amoy" },
  97:       { key: "bnb",      name: "BNB Chain Testnet" },
};

const PRESETS: Record<"ethereum"|"polygon"|"bnb", { title: string; objectives: string[] }> = {
  ethereum: {
    title: "ETHEREUM: FINALITY RUN",
    objectives: [
      "Bridge or interact with a L2 (Arbitrum/Optimism/Base)",
      "Sign a message proving account ownership",
      "Return to Dashboard and claim rewards",
    ],
  },
  polygon: {
    title: "POLYGON AMOY: QUANTUM RELAY",
    objectives: [
      "Ping a dApp related to ZK scaling or gaming",
      "Sign a message proving identity",
      "Return to the Dashboard and claim rewards",
    ],
  },
  bnb: {
    title: "BNB CHAIN: QUANTUM RELAY",
    objectives: [
      "Try a low‑fee dApp (DEX, faucet or swap)",
      "Sign a message proving identity",
      "Return to the Dashboard and claim rewards",
    ],
  },
};

// --- Helpers Gemini ---
function stripCodeFences(s: string) {
  return s.trim().replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
}
function pickPreset(worldKey: "ethereum"|"polygon"|"bnb") {
  return PRESETS[worldKey];
}
async function callGemini(model: string, apiKey: string, userPrompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 256,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Gemini HTTP ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) throw new Error("Gemini empty response");
  return stripCodeFences(text);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const world: number | undefined = Number(body?.world);
    const w = WORLDS[world ?? 0] ?? WORLDS[97]; // default BNB si no viene nada

    // Si no hay API key, usamos preset
    const apiKey = process.env.GEMINI_API_KEY;
    const model  = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    // Prompt: pídele a Gemini SOLO JSON {title, objectives[], amount}
    const prompt = `
You are an assistant for a blockchain quest dapp. Generate ONE short quest for the network: ${w.name} (${w.key}).
Constraints:
- 3 concise objectives, actionable in 3–8 minutes each.
- Safe for testnets; no real funds required.
- Prefer generic actions (visit dApp, sign message, interact with faucet/DEX on testnet, return to dashboard).
- Keep it fun and thematic to ${w.name}.
- Output MUST be valid JSON ONLY (no prose, no backticks).

Schema:
{
  "title": "UPPERCASE SHORT TITLE",
  "objectives": ["...", "...", "..."],
  "amount": 10
}
    `.trim();

    let questFromAI: { title: string; objectives: string[]; amount?: number } | null = null;

    if (apiKey) {
      try {
        const raw = await callGemini(model, apiKey, prompt);
        const parsed = JSON.parse(raw);
        // Validación mínima
        if (
          parsed &&
          typeof parsed.title === "string" &&
          Array.isArray(parsed.objectives) &&
          parsed.objectives.length >= 3
        ) {
          questFromAI = {
            title: String(parsed.title).toUpperCase().slice(0, 64),
            objectives: parsed.objectives.slice(0, 3).map((s: any) => String(s).slice(0, 120)),
            amount: Number(parsed.amount) || 10,
          };
        }
      } catch (err) {
        console.warn("Gemini fallback to preset:", (err as Error).message);
      }
    }

    const base = questFromAI ?? pickPreset(w.key);
    const amount = questFromAI?.amount ?? 10;

    return NextResponse.json({
      ok: true,
      quest: {
        title: base.title,
        objectives: base.objectives,
        status: "active",
        world,
        amount, // el client lo usa para mostrar +XP
      },
    });
  } catch (err: any) {
    // fallback duro
    return NextResponse.json({
      ok: true,
      quest: {
        title: "OFFLINE QUEST",
        objectives: ["Try again later", "Keep exploring", "Have fun"],
        status: "active",
        amount: 10,
      },
    });
  }
}
