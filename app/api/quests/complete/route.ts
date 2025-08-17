export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // podrías leer { chain } del body si quieres loguearlo
  // const { chain } = await req.json().catch(() => ({}));
  const reward = { zetaPoints: 10 };
  return NextResponse.json({ ok: true, reward });
}
