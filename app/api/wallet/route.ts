import { NextRequest, NextResponse } from "next/server";
import { getWalletHistory, ValidationError } from "@/lib/transfers";

export const maxDuration = 300;

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

    // The drain always covers every page; `limit` only trims how much of
    // the merged history is serialized back (keeps payloads sane for UIs).
    const limitRaw = req.nextUrl.searchParams.get("limit");
    const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10) || 0) : 0;
    const body =
      limit > 0 && data.transfers.length > limit
        ? { ...data, transfers: data.transfers.slice(0, limit), returnedCount: limit }
        : { ...data, returnedCount: data.transfers.length };

    return NextResponse.json(body);
  } catch (err: any) {
    console.error("API error:", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const msg = String(err?.message || err);
    if (/resolve/i.test(msg)) {
      return NextResponse.json({ error: msg.slice(0, 200) }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error", details: msg.slice(0, 200) },
      { status: 500 }
    );
  }
}