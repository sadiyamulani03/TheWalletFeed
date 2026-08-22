# Wallet Activity Feed

A Node.js/TypeScript tool that queries a wallet address's complete transfer history across Ethereum chains using Alchemy's Transfers API.

## 📋 Problem Solved

"A DeFi-adjacent friend keeps pasting wallet addresses into a block explorer trying to piece together what did this address actually do — swaps, NFT buys, incoming payments and gives up halfway through page 3 of results. They want a simple lookup tool: paste an address, get back a clean, complete history of everything it sent and received."

## ✨ Features

- **Multi-category transfers**: Fetches external ETH, ERC-20, ERC-721, ERC-1155, and internal transfers
- **Full pagination**: Drains all pages from Alchemy's API (no truncation at first page)
- **Sent & received separation**: Clearly shows what the address sent vs received
- **Chronological ordering**: Results sorted by block timestamp
- **Formatted output**: Human-readable display with values properly decimated

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Alchemy API key (sign up at [alchemy.com](https://alchemy.com))

### Installation

```bash
# Clone the repo
git clone https://github.com/sadiyamulani03/TheWalletFeed.git

# Install dependencies
cd TheWalletFeed

# Set up environment variable (get your key at alchemy.com)
echo "ALCHEMY_API_KEY=<your-key-here>" > .env

# Run the web app locally
npm run dev
```

### Or Run the CLI

```bash
# With Alchemy API key from .env or environment
npm run cli -- 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# ENS names work too
npm run cli -- vitalik.eth
```

## 📊 Output Example

```
=== Wallet Activity Feed: vitalik.eth (0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045) ===
Total transfers fetched: 317595 (sent: 14624, received: 301466, self: 1505)

Transfer History (most recent first):
============================================================
2026-08-22 04:45 UTC | RECEIVED | ERC20   | 12,345.67 USDC | 0x310a80...
2026-08-21 19:02 UTC | SENT     | ETH     | 0.42 ETH       | 0x9f2b1c...
... (and more transfers)

===========================================================
SUMMARY
Total transfers: 317595
Sent from address: 14624
Received at address: 301466
Self-transfers: 1505
Categories: erc20=149163, erc721=69757, internal=51517, external=46272, erc1155=886
```

Numbers above are from a real full drain of `vitalik.eth`. Whale wallets take a
few minutes on first lookup because every page of history is fetched — the UI
streams live progress while it works, and repeat lookups hit the in-process
cache.

## 🛠️ Tech Stack

- **Next.js 16 + React 19** - Web app & API route
- **Node.js + TypeScript** - CLI tool (`src/cli.ts`)
- **Alchemy SDK** - Transfers API (multi-category, bidirectional, fully paginated)
- **npm** - Package manager

## 📦 npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run the Next.js web app locally |
| `npm run build` | Build the Next.js app |
| `npm run start` | Start the built Next.js app |
| `npm run cli -- <addr\|ens>` | Run the CLI tool |

The web app exposes `GET /api/wallet?address=<0x… or name.eth>` returning merged,
chronologically-sorted JSON for both directions across all transfer categories.

## 🏆 Road to Devcon I

This project was built for the **Road to Devcon - I** marathon on [Loops House](https://www.loops.house/road-to-devcon-i).

- **Problem**: The Wallet That Won't Explain Itself (`wallet-activity-feed`)
- **Stage**: `build_open`
- **Deadline**: Aug 23, 2026, 11:11 PM (Asia/Calcutta)

## 📄 License

ISC License