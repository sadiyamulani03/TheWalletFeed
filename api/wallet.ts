import { Alchemy } from "alchemy-sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const CATEGORIES = ["external", "internal", "erc20", "erc721", "erc1155", "specialnft"];
const MAX_PAGES_PER_DIRECTION = 60;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

type AnyTransfer = Record<string, any>;

async function fetchDirection(
  alchemy: Alchemy,
  params: Record<string, any>
): Promise<{ transfers: AnyTransfer[]; truncated: boolean }> {
  const out: AnyTransfer[] = [];
  let pageKey: string | undefined;
  let pages = 0;
  let truncated = false;

  while (pages < MAX_PAGES_PER_DIRECTION) {
    const res: any = await alchemy.core.getAssetTransfers({ ...params, pageKey });
    out.push(...(res.transfers || []));
    pageKey = res.pageKey;
    pages++;
    if (!pageKey) return { transfers: out, truncated };
  }
  return { transfers: out, truncated: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ALCHEMY_API_KEY not configured" });
    }

    const rawInput = typeof req.query.address === "string" ? req.query.address.trim() : "";
    if (!rawInput) {
      return res.status(400).json({ error: "address parameter required" });
    }

    const alchemy = new Alchemy({ apiKey });
    let address = rawInput;

    if (!ADDR_RE.test(address)) {
      const resolved = await alchemy.core.resolveName(rawInput.endsWith(".eth") ? rawInput : `${rawInput}.eth`);
      if (!resolved) {
        return res.status(400).json({ error: `Could not resolve "${rawInput}" to an address` });
      }
      address = resolved;
    }

    const lower = address.toLowerCase();

    const [sentRes, recvRes] = await Promise.all([
      fetchDirection(alchemy, {
        fromAddress: address,
        category: CATEGORIES,
        withMetadata: true,
        order: "desc",
        maxCount: "0x3e8",
      }),
      fetchDirection(alchemy, {
        toAddress: address,
        category: CATEGORIES,
        withMetadata: true,
        order: "desc",
        maxCount: "0x3e8",
      }),
    ]);

    const seen = new Set<string>();
    const merged: AnyTransfer[] = [];

    const push = (t: AnyTransfer, dir: "SENT" | "RECEIVED") => {
      const key = `${t.hash}|${t.category}|${t.asset}|${t.tokenId ?? ""}|${t.blockNum}`;
      if (seen.has(key)) {
        const found = merged.find((m) => `${m.hash}|${m.category}|${m.asset}|${m.tokenId ?? ""}|${m.blockNum}` === key);
        if (found && found.direction !== dir) found.direction = "SELF";
        return;
      }
      seen.add(key);
      merged.push({
        hash: t.hash,
        blockNum: t.blockNum,
        blockTimestamp: t.metadata?.blockTimestamp ?? t.blockTimestamp ?? null,
        category: t.category,
        direction: t.from?.toLowerCase() === lower && t.to?.toLowerCase() === lower ? "SELF" : dir,
        from: t.from,
        to: t.to,
        value: t.value ?? null,
        asset: t.asset ?? null,
        decimals: t.decimals ?? null,
        tokenId: t.tokenId ?? null,
        contract: t.assetContract?.contractAddress ?? null,
      });
    };

    sentRes.transfers.forEach((t) => push(t, "SENT"));
    recvRes.transfers.forEach((t) => push(t, "RECEIVED"));

    merged.sort((a, b) => {
      const na = parseInt(a.blockNum, 16);
      const nb = parseInt(b.blockNum, 16);
      return nb - na;
    });

    const timestamps = merged.map((t) => t.blockTimestamp).filter(Boolean).sort();
    const counts = merged.reduce(
      (acc: any, t) => {
        acc[t.direction.toLowerCase()]++;
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      },
      { sent: 0, received: 0, self: 0 }
    );

    return res.status(200).json({
      input: rawInput,
      address,
      network: "ethereum-mainnet",
      total: merged.length,
      sentCount: counts.sent,
      receivedCount: counts.received,
      selfCount: counts.self,
      byCategory: Object.entries(counts)
        .filter(([k]) => !["sent", "received", "self"].includes(k))
        .map(([category, count]) => ({ category, count })),
      firstActivity: timestamps[0] ?? null,
      lastActivity: timestamps[timestamps.length - 1] ?? null,
      truncated: sentRes.truncated || recvRes.truncated,
      transfers: merged,
    });
  } catch (err: any) {
    console.error("API error:", err);
    const msg = String(err?.message || err);
    if (/invalid|address/i.test(msg)) {
      return res.status(400).json({ error: "Invalid address format" });
    }
    return res.status(500).json({ error: "Internal server error", details: msg.slice(0, 200) });
  }
}