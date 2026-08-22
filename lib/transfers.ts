import { Alchemy, AssetTransfersParams } from "alchemy-sdk";

export const CATEGORIES = [
  "external",
  "internal",
  "erc20",
  "erc721",
  "erc1155",
  "specialnft",
] as const;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const ENS_RE = /^[a-zA-Z0-9-]{3,}(\.[a-zA-Z0-9-]{2,})+$/;

type AnyTransfer = Record<string, any>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(
  alchemy: Alchemy,
  params: AssetTransfersParams,
  pageKey?: string
): Promise<{ transfers: AnyTransfer[]; pageKey?: string }> {
  let attempt = 0;
  for (;;) {
    try {
      return await alchemy.core.getAssetTransfers({ ...params, pageKey });
    } catch (err) {
      attempt++;
      if (attempt >= 7) throw err;
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 15000));
    }
  }
}

async function fetchDirection(
  alchemy: Alchemy,
  params: AssetTransfersParams,
  onPage: (page: AnyTransfer[]) => void
): Promise<void> {
  // Pagination chains are inherently sequential (each page needs the
  // previous pageKey) and the free tier throttles hard under concurrency,
  // so we drain one chain per direction at a steady, patient pace.
  let pageKey: string | undefined;
  for (;;) {
    const res = await fetchPage(alchemy, params, pageKey);
    const page = res.transfers || [];
    if (page.length > 0) onPage(page);
    if (!res.pageKey) break;
    pageKey = res.pageKey;
    await sleep(250);
  }
}

export class ValidationError extends Error {}

type CacheEntry = { data: any; at: number };
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): any | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: any) {
  if (cache.size > 20) cache.clear();
  cache.set(key, { data, at: Date.now() });
}

export async function getWalletHistory(
  rawInput: string,
  onProgress?: (drained: number) => void
) {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("ALCHEMY_API_KEY not configured");

  // Validate input BEFORE any API call: it must be a well-formed hex
  // address or a plausible ENS name — nothing else gets through.
  const input = rawInput.trim();
  if (ADDR_RE.test(input)) {
    // valid address, continue below
  } else if (ENS_RE.test(input)) {
    // valid ENS-shaped name, resolved after the Alchemy client is created
  } else if (/^0x/i.test(input)) {
    throw new ValidationError(
      "That looks like an attempt at an address but it's malformed — addresses are 0x followed by exactly 40 hex characters."
    );
  } else {
    throw new ValidationError(
      "Please enter a valid Ethereum address (0x + 40 hex characters) or an ENS name like vitalik.eth."
    );
  }

  const alchemy = new Alchemy({ apiKey });
  let address = input;

  if (!ADDR_RE.test(address)) {
    const name = address.endsWith(".eth") ? address : `${address}.eth`;
    const resolved = await alchemy.core.resolveName(name);
    if (!resolved) throw new Error(`Could not resolve "${rawInput}" to an address`);
    address = resolved;
  }

  const lower = address.toLowerCase();

  // A full drain of a whale wallet takes minutes, so cache the merged
  // result per address for a while — repeat lookups on the same
  // server instance are instant.
  const cached = cacheGet(lower);
  if (cached) {
    onProgress?.(cached.total);
    return { ...cached, input: rawInput };
  }

  const baseParams = {
    withMetadata: true as const,
    order: "desc" as const,
    maxCount: 1000,
    category: [...CATEGORIES],
  };

  // Alchemy can serve overlapping pages when chains run in parallel, so
  // dedupe incrementally as pages arrive — a Map keyed on the transfer's
  // natural identity keeps this O(1) per item.
  const seen = new Map<string, number>();
  const merged: AnyTransfer[] = [];

  const ingest = (t: AnyTransfer, dir: "SENT" | "RECEIVED") => {
    const key = `${t.hash}|${t.category}|${t.asset}|${t.tokenId ?? ""}|${t.blockNum}`;
    const existingIdx = seen.get(key);
    if (existingIdx !== undefined) {
      const found = merged[existingIdx];
      if (found.direction !== dir) found.direction = "SELF";
      return;
    }
    seen.set(key, merged.length);
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

  await Promise.all([
    fetchDirection(
      alchemy,
      {
        ...baseParams,
        fromAddress: address,
      } as unknown as AssetTransfersParams,
      (page) => {
        for (const t of page) ingest(t, "SENT");
        onProgress?.(merged.length);
      }
    ),
    fetchDirection(
      alchemy,
      {
        ...baseParams,
        toAddress: address,
      } as unknown as AssetTransfersParams,
      (page) => {
        for (const t of page) ingest(t, "RECEIVED");
        onProgress?.(merged.length);
      }
    ),
  ]);

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

  const result = {
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
    transfers: merged,
  };

  cacheSet(lower, result);
  return result;
}
