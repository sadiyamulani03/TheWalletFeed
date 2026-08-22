import { Alchemy, AssetTransfersParams } from "alchemy-sdk";

export const CATEGORIES = [
  "external",
  "internal",
  "erc20",
  "erc721",
  "erc1155",
  "specialnft",
] as const;

const MAX_PAGES_PER_DIRECTION = 60;
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

type AnyTransfer = Record<string, any>;

async function fetchDirection(
  alchemy: Alchemy,
  params: AssetTransfersParams
): Promise<{ transfers: AnyTransfer[]; truncated: boolean }> {
  const out: AnyTransfer[] = [];
  let pageKey: string | undefined;
  let pages = 0;

  while (pages < MAX_PAGES_PER_DIRECTION) {
    const res = await alchemy.core.getAssetTransfers({ ...params, pageKey });
    out.push(...(res.transfers || []));
    pageKey = res.pageKey;
    pages++;
    if (!pageKey) return { transfers: out, truncated: false };
  }
  return { transfers: out, truncated: true };
}

export async function getWalletHistory(rawInput: string) {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("ALCHEMY_API_KEY not configured");

  const alchemy = new Alchemy({ apiKey });
  let address = rawInput;

  if (!ADDR_RE.test(address)) {
    const name = address.endsWith(".eth") ? address : `${address}.eth`;
    const resolved = await alchemy.core.resolveName(name);
    if (!resolved) throw new Error(`Could not resolve "${rawInput}" to an address`);
    address = resolved;
  }

  const lower = address.toLowerCase();

  const baseParams = {
    withMetadata: true as const,
    order: "desc" as const,
    maxCount: 1000,
    category: [...CATEGORIES],
  };

  const [sentRes, recvRes] = await Promise.all([
    fetchDirection(alchemy, {
      ...baseParams,
      fromAddress: address,
    } as unknown as AssetTransfersParams),
    fetchDirection(alchemy, {
      ...baseParams,
      toAddress: address,
    } as unknown as AssetTransfersParams),
  ]);

  const seen = new Set<string>();
  const merged: AnyTransfer[] = [];

  const push = (t: AnyTransfer, dir: "SENT" | "RECEIVED") => {
    const key = `${t.hash}|${t.category}|${t.asset}|${t.tokenId ?? ""}|${t.blockNum}`;
    if (seen.has(key)) {
      const found = merged.find(
        (m) =>
          `${m.hash}|${m.category}|${m.asset}|${m.tokenId ?? ""}|${m.blockNum}` === key
      );
      if (found && found.direction !== dir) found.direction = "SELF";
      return;
    }
    seen.add(key);
    merged.push({
      hash: t.hash,
      blockNum: t.blockNum,
      blockTimestamp: t.metadata?.blockTimestamp ?? t.blockTimestamp ?? null,
      category: t.category,
      direction:
        t.from?.toLowerCase() === lower && t.to?.toLowerCase() === lower
          ? "SELF"
          : dir,
      from: t.from,
      to: t.to,
      value: t.value ?? null,
      asset: t.asset ?? null,
      tokenId: t.tokenId ?? null,
      contract: t.assetContract?.contractAddress ?? null,
    });
  };

  sentRes.transfers.forEach((t) => push(t, "SENT"));
  recvRes.transfers.forEach((t) => push(t, "RECEIVED"));

  merged.sort(
    (a, b) => parseInt(b.blockNum, 16) - parseInt(a.blockNum, 16)
  );

  const timestamps = merged
    .map((t) => t.blockTimestamp)
    .filter(Boolean)
    .sort();

  const counts: Record<string, number> = {};
  for (const t of merged) counts[t.direction] = (counts[t.direction] || 0) + 1;

  const byCategory = Object.entries(
    merged.reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([category, count]) => ({ category, count }));

  return {
    input: rawInput,
    address,
    network: "ethereum-mainnet",
    total: merged.length,
    sentCount: counts.SENT || 0,
    receivedCount: counts.RECEIVED || 0,
    selfCount: counts.SELF || 0,
    byCategory,
    firstActivity: timestamps[0] ?? null,
    lastActivity: timestamps[timestamps.length - 1] ?? null,
    truncated: sentRes.truncated || recvRes.truncated,
    transfers: merged,
  };
}
