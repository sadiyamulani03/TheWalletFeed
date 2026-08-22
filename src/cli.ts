import "dotenv/config";
import { getWalletHistory } from "../lib/transfers";

function short(addr: string | null | undefined): string {
  if (!addr) return "—";
  return `${addr.slice(0, 10)}…${addr.slice(-6)}`;
}

async function main() {
  const input = process.env.WALLET_ADDRESS || process.argv[2];
  if (!input) {
    console.error("Usage: node dist/cli.js <0xAddress | name.eth>");
    process.exit(1);
  }

  console.log(`\n=== Wallet Activity Feed: ${input} ===`);
  console.log("Draining every page, both directions…\n");

  const data = await getWalletHistory(input);

  console.log(
    `Total transfers fetched: ${data.total.toLocaleString()} ` +
      `(sent: ${data.sentCount.toLocaleString()}, received: ${data.receivedCount.toLocaleString()}, self: ${data.selfCount})`
  );
  if (data.input.toLowerCase() !== data.address.toLowerCase()) {
    console.log(`Resolved ${data.input} → ${data.address}`);
  }

  console.log("\nTransfer History (most recent first):");
  console.log("=".repeat(60));
  for (const t of data.transfers.slice(0, 50)) {
    const ts = t.blockTimestamp
      ? new Date(t.blockTimestamp).toISOString().replace("T", " ").slice(0, 16) + " UTC"
      : `block ${parseInt(t.blockNum, 16)}`;
    const value = t.value == null
      ? t.tokenId != null && t.tokenId !== ""
        ? `NFT #${String(t.tokenId).slice(0, 8)}`
        : t.asset || "NFT"
      : `${Number(t.value).toLocaleString()}${t.asset ? " " + t.asset : ""}`;
    console.log(`${ts} | ${t.direction.padEnd(8)} | ${t.category.toUpperCase().padEnd(9)} | ${value.padEnd(20)} | ${short(t.direction === "SENT" ? t.to : t.from)}`);
  }
  if (data.transfers.length > 50) {
    console.log(`... and ${(data.transfers.length - 50).toLocaleString()} more`);
  }

  console.log("=".repeat(60));
  console.log("\nSUMMARY");
  console.log(`Total transfers: ${data.total.toLocaleString()}`);
  console.log(`Sent from address: ${data.sentCount}`);
  console.log(`Received at address: ${data.receivedCount}`);
  console.log(`Self-transfers: ${data.selfCount}`);
  if (data.firstActivity) console.log(`First activity: ${data.firstActivity}`);
  if (data.lastActivity) console.log(`Last activity: ${data.lastActivity}`);
  console.log(`Categories: ${data.byCategory.map((c) => `${c.category}=${c.count}`).join(", ")}`);
}

main().catch((err) => {
  console.error(`Error: ${err?.message ?? err}`);
  process.exit(1);
});