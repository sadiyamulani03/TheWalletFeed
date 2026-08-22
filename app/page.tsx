"use client";

import { useState } from "react";

type Transfer = {
  hash: string;
  blockNum: string;
  blockTimestamp: string | null;
  category: string;
  direction: "SENT" | "RECEIVED" | "SELF";
  from: string;
  to: string;
  value: number | null;
  asset: string | null;
  tokenId: string | null;
  contract: string | null;
};

type WalletData = {
  input: string;
  address: string;
  total: number;
  sentCount: number;
  receivedCount: number;
  selfCount: number;
  byCategory: { category: string; count: number }[];
  firstActivity: string | null;
  lastActivity: string | null;
  transfers: Transfer[];
  returnedCount?: number;
};

const PAGE = 50;

const LOADING_LINES = [
  "Pulling every page of history — some wallets have a lot of story to tell…",
  "Reading the ledger, line by line…",
  "Still draining pages. Big wallets take a breath or two…",
];

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function fmtValue(t: Transfer): string {
  if (t.value == null) {
    if (t.tokenId != null && t.tokenId !== "") return `NFT #${String(t.tokenId).slice(0, 10)}`;
    if (t.asset) return t.asset;
    return "an NFT";
  }
  const v = Number(t.value);
  const s =
    Math.abs(v) >= 1000
      ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : Math.abs(v) >= 1
      ? v.toLocaleString(undefined, { maximumFractionDigits: 4 })
      : v.toPrecision(4).replace(/\.?0+$/, "");
  return t.asset ? `${s} ${t.asset}` : s;
}

const CAT_LABELS: Record<string, string> = {
  external: "EXTERNAL",
  internal: "INTERNAL",
  erc20: "ERC-20",
  erc721: "ERC-721",
  erc1155: "ERC-1155",
  specialnft: "NFT",
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const [lineIdx, setLineIdx] = useState(0);

  async function lookup(q?: string) {
    const target = (q ?? query).trim();
    if (!target) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(
        `/api/wallet?address=${encodeURIComponent(target)}&limit=5000`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json);
      setFilter("all");
      setShown(PAGE);
    } catch (err: any) {
      setError(err.message || "Something went sideways. Try again?");
    } finally {
      setLoading(false);
    }
  }

  function matches(t: Transfer): boolean {
    if (filter === "all") return true;
    if (["RECEIVED", "SENT", "SELF"].includes(filter)) return t.direction === filter;
    if (filter === "eth") return t.category === "external" || t.category === "internal";
    if (filter === "erc20") return t.category === "erc20";
    if (filter === "nft") return ["erc721", "erc1155", "specialnft"].includes(t.category);
    return true;
  }

  const visible = data?.transfers.filter(matches) ?? [];

  return (
    <div className="container">
      <header>
        <h1>⛓ Wallet Activity Feed</h1>
        <p>
          Every wallet tells a story — paste an address or ENS name and read
          yours.
        </p>
      </header>

      <div className="search-box">
        <input
          className="mono"
          type="text"
          placeholder="0xd8dA…6045 or vitalik.eth"
          value={query}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          aria-label="Wallet address or ENS name"
        />
        <button onClick={() => lookup()} disabled={loading}>
          {loading ? "Digging…" : "Trace it"}
        </button>
      </div>
      <p className="hint">
        No sign-up, no fluff — just the raw ledger, made readable ·{" "}
        <button
          style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", textDecoration: "underline" }}
          onClick={() => { setQuery("vitalik.eth"); lookup("vitalik.eth"); }}
        >
          peek at vitalik.eth
        </button>
      </p>

      {error && <div className="error-msg">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>{LOADING_LINES[lineIdx % LOADING_LINES.length]}</span>
          {lineIdx > 0 && (
            <button
              onClick={() => setLineIdx((i) => i + 1)}
              style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "#6b7280", fontSize: 12, textDecoration: "underline", cursor: "pointer" }}
            >
              still going? here&apos;s another thought…
            </button>
          )}
        </div>
      )}

      {data && (
        <>
          <div className="summary">
            <div className="stat-card">
              <div className="label">Transfers found</div>
              <div className="value">{data.total.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="label">Sent</div>
              <div className="value" style={{ color: "var(--red)" }}>
                {data.sentCount.toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Received</div>
              <div className="value" style={{ color: "var(--green)" }}>
                {data.receivedCount.toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Last move</div>
              <div className="value" style={{ fontSize: 15, lineHeight: 1.5 }}>
                {timeAgo(data.lastActivity) || "–"}
              </div>
            </div>
          </div>

          <div className="addr-line">
            <span className="addr-chip mono">
              {data.input.toLowerCase() !== data.address.toLowerCase() && (
                <>
                  <b style={{ color: "var(--text)" }}>{data.input}</b> →{" "}
                </>
              )}
              <a href={`https://etherscan.io/address/${data.address}`} target="_blank" rel="noopener noreferrer">
                {data.address.slice(0, 8)}…{data.address.slice(-6)}
              </a>
            </span>
            {data.returnedCount != null && data.returnedCount < data.total && (
              <span className="addr-chip warn-chip">
                showing newest {data.returnedCount.toLocaleString()} of{" "}
                {data.total.toLocaleString()} — stats above cover everything
              </span>
            )}
          </div>

          <div className="filters">
            {[
              ["all", "Everything"],
              ["RECEIVED", "Received"],
              ["SENT", "Sent"],
              ["SELF", "Self"],
              ["eth", "ETH"],
              ["erc20", "Tokens"],
              ["nft", "NFTs"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`chip ${filter === key ? "active" : ""}`}
                onClick={() => { setFilter(key); setShown(PAGE); }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="feed">
            {visible.slice(0, shown).map((t) => {
              const dirCls = t.direction === "SENT" ? "sent" : t.direction === "RECEIVED" ? "received" : "self";
              const arrow = t.direction === "SENT" ? "↗" : t.direction === "RECEIVED" ? "↘" : "⟳";
              const counterparty = t.direction === "SENT" ? t.to : t.from;
              const isNft = ["erc721", "erc1155", "specialnft"].includes(t.category);
              return (
                <div className="tx-row" key={`${t.hash}-${t.category}-${t.tokenId ?? ""}`}>
                  <div className={`dir-icon dir-${dirCls}`}>{arrow}</div>
                  <div className="tx-main">
                    <div className="tx-title">
                      <span className="tx-value">{fmtValue(t)}</span>
                      <span className={`badge b-${dirCls}`}>{t.direction.toLowerCase()}</span>
                      <span className={`badge ${isNft ? "b-nft" : "b-cat"}`}>
                        {CAT_LABELS[t.category] ?? t.category}
                      </span>
                    </div>
                    <div className="tx-sub">
                      {t.direction !== "SELF" && counterparty && (
                        <>
                          {t.direction === "SENT" ? "to" : "from"}{" "}
                          <a className="mono" href={`https://etherscan.io/address/${counterparty}`} target="_blank" rel="noopener noreferrer">
                            {counterparty.slice(0, 8)}…{counterparty.slice(-6)}
                          </a>{" "}
                          ·{" "}
                        </>
                      )}
                      <a className="mono" href={`https://etherscan.io/tx/${t.hash}`} target="_blank" rel="noopener noreferrer">
                        {t.hash.slice(0, 10)}…{t.hash.slice(-6)}
                      </a>
                    </div>
                  </div>
                  <div className="tx-side">
                    <div className="tx-date">
                      {timeAgo(t.blockTimestamp)}
                      {t.blockTimestamp &&
                        ` · ${new Date(t.blockTimestamp).toLocaleDateString()}`
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {visible.length === 0 && (
            <div className="empty-state">
              Nothing here — this wallet hasn&apos;t done that (yet).
            </div>
          )}

          {shown < visible.length && (
            <div className="load-more-wrap">
              <button onClick={() => setShown((s) => s + PAGE)}>
                Show more ({(visible.length - shown).toLocaleString()} left)
              </button>
            </div>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className="empty-state" style={{ paddingTop: 40 }}>
          <p style={{ fontSize: 15 }}>
            Try an address above, or borrow someone famous&apos; wallet to poke around.
          </p>
        </div>
      )}

      <footer>
        Built with Next.js, TypeScript &amp; the Alchemy Transfers API for{" "}
        <a href="https://www.loops.house/road-to-devcon-i" target="_blank" rel="noopener noreferrer">
          Road to Devcon I
        </a>{" "}
        · every category, both directions, every page ·{" "}
        <a href="https://github.com/sadiyamulani03/TheWalletFeed" target="_blank" rel="noopener noreferrer">
          source
        </a>
      </footer>
    </div>
  );
}