import { Alchemy } from "alchemy-sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: "address parameter required" });
    }

    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ALCHEMY_API_KEY not configured" });
    }

    const alchemy = new Alchemy({ apiKey });
    const CATEGORIES = ["external", "erc20", "erc721", "erc1155", "internal"];

    const allTransfers: any[] = [];
    let pageKey: string | undefined;

    let pageCount = 0;
    while (pageCount < 10) {
      const response: any = await alchemy.core.getAssetTransfers({
        fromAddress: address,
        toAddress: address,
        category: CATEGORIES,
        withMetadata: true,
        order: "asc",
        pageKey,
      } as any);

      if (response.transfers.length === 0) break;
      allTransfers.push(...response.transfers);
      if (!response.pageKey) break;
      pageKey = response.pageKey;
      pageCount++;
    }

    // Sort chronologically
    allTransfers.sort((a: any, b: any) => 
      (a.blockTimestamp ? new Date(a.blockTimestamp).getTime() : 0) - 
      (b.blockTimestamp ? new Date(b.blockTimestamp).getTime() : 0)
    );

    // Format response
    const formatted = allTransfers.map((t: any) => ({
      hash: t.hash,
      from: t.from,
      to: t.to,
      category: t.category,
      value: t.value,
      blockTimestamp: t.blockTimestamp,
      direction: t.from === address ? "SENT" : "RECEIVED"
    }));

    return res.status(200).json({
      address: req.query.address,
      total: allTransfers.length,
      transfers: formatted
    });

  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
