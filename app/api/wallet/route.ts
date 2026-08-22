import { NextRequest, NextResponse } from "next/server";
import { getWalletHistory } from "@/lib/transfers";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const rawInput = req.nextUrl.searchParams.get("address")?.trim() ?? "";
    if (!rawInput) {
      return NextResponse.json(
        { error: "address parameter required" },
        { status: 400 }
      );
    }

    const data = await getWalletHistory(rawInput);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("API error:", err);
    const msg = String(err?.message || err);
    if (/resolve|invalid/i.test(msg)) {
      return NextResponse.json({ error: msg.slice(0, 200) }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error", details: msg.slice(0, 200) },
      { status: 500 }
    );
  }
}