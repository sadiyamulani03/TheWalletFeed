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
git clone https://github.com/sadiyamulani03/wallet-activity-feed.git

# Install dependencies
cd wallet-activity-feed
npm install

# Set up environment variable
echo "ALCHEMY_API_KEY=***REMOVED***" > .env

# Run the script
npm run dev
```

### Or Run Directly

```bash
# With Alchemy API key
ALCHEMY_API_KEY=***REMOVED*** node dist/walletActivity.js

# Or with custom wallet address
WALLET_ADDRESS=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 ALCHEMY_API_KEY=***REMOVED*** node dist/walletActivity.js
```

## 📊 Output Example

```
=== Wallet Activity Feed: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 ===
Total transfers fetched: 1355 across 1 page(s)

Transfer History (most recent first):
============================================================
2026-08-22 | RECEIVED | ERC20      | $0.0002 | 0x81faa7c1...
2026-08-22 | RECEIVED | ERC20      | $0.0001 | 0x7e74df42...
... (and more transfers)

============================================================
SUMMARY
Total transfers: 1355
Sent from address: 0
Received at address: 0
Pages drained: 1
Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

## 🛠️ Tech Stack

- **Node.js** - Runtime
- **TypeScript** - Type safety
- **Alchemy SDK** - Ethereum API client
- **npm** - Package manager

## 📦 npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run with `ts-node` (for development) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled `dist/walletActivity.js` |

## 🏆 Road to Devcon I

This project was built for the **Road to Devcon - I** marathon on [Loops House](https://www.loops.house/road-to-devcon-i).

- **Problem**: The Wallet That Won't Explain Itself (`wallet-activity-feed`)
- **Stage**: `build_open`
- **Deadline**: Aug 23, 2026, 11:11 PM (Asia/Calcutta)

## 📄 License

ISC License