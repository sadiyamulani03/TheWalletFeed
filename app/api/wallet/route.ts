import { NextRequest, NextResponse } from "next/server";
import { getWalletHistory, ValidationError } from "@/lib/transfers";

export const maxDuration = 300;

function buildBody(data: any, limitRaw: string | null) {
  // The drain always covers every page; `limit` only trims how much of
  // the merged history is serialized back (keeps payloads sane for UIs).
  const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10) || 0) : 0;
  return limit > 0 && data.transfers.length > limit
    ? { ...data, transfers: data.transfers.slice(0, limit), returnedCount: limit }
    : { ...data, returnedCount: data.transfers.length };
}

export async function GET(req: NextRequest) {
  const rawInput = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  if (!rawInput) {
    return NextResponse.json(
      { error: "address parameter required" },
      { status: 400 }
    );
  }
  const streamMode = req.nextUrl.searchParams.get("stream") === "1";

  try {
    // With stream=1 the route answers immediately and pushes NDJSON lines:
    // progress events while pages drain, then one final "done" event.
    if (streamMode) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) =>
            controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
          try {
            const data = await getWalletHistory(rawInput, (drained) =>
              send({ type: "progress", drained })
            );
            send({ type: "done", data: buildBody(data, req.nextUrl.searchParams.get("limit")) });
          } catch (err: any) {
            console.error("API error:", err);
            const msg = String(err?.message || err);
            send({
              type: "error",
              status: err instanceof ValidationError || /resolve/i.test(msg) ? 400 : 500,
              message:
                err instanceof ValidationError || /resolve/i.test(msg)
                  ? msg.slice(0, 200)
                  : "Something went wrong on our side — try again in a moment.",
            });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const data = await getWalletHistory(rawInput);
    return NextResponse.json(
      buildBody(data, req.nextUrl.searchParams.get("limit"))
    );
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
