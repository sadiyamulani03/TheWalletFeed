import { Alchemy } from "alchemy-sdk";

const apiKey = process.env.ALCHEMY_API_KEY;
const walletAddress = process.env.WALLET_ADDRESS || "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

if (!apiKey) {
  console.error("ALCHEMY_API_KEY environment variable required");
  process.exit(1);
}

const alchemy = new Alchemy({ apiKey });

async function fetchWalletActivity(address: string) {
  const allTransfers: any[] = [];
  let pageKey: string | undefined;

  // Fetch all categories as required by the problem brief
  const CATEGORIES = ["external", "erc20", "erc721", "erc1155", "internal"];

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

  console.log(`\n=== Wallet Activity Feed: ${address} ===`);
  console.log(`Total transfers fetched: ${allTransfers.length} across ${pageCount} page(s)\n`);

  // Format all transfers chronologically
  allTransfers.sort((a: any, b: any) => 
    (a.blockTimestamp ? new Date(a.blockTimestamp).getTime() : 0) - (b.blockTimestamp ? new Date(b.blockTimestamp).getTime() : 0)
  );

  // Print summary header
  console.log("Transfer History (most recent first):");
  console.log("=".repeat(60));

  // Print each transfer
  for (let i = allTransfers.length - 1; i >= 0; i--) {
    const t = allTransfers[i];
    const decimals = t.value ? (t.decimals || 18) : 18;
    const num = parseFloat(t.value) / Math.pow(10, decimals);
    const side = t.from === address ? "SENT" : "RECEIVED";
    const category = t.category.toUpperCase().padEnd(10);
    const value = Number(num.toFixed(4));
    const date = t.blockTimestamp ? new Date(t.blockTimestamp).toISOString().split("T")[0] : "unknown";
    const hashShort = t.hash.substring(0, 10) + "...";
    const valueStr = value.toString().padEnd(6);

    console.log(`${date} | ${side.padEnd(6)} | ${category} | $${valueStr} | ${hashShort}`);
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log(`SUMMARY`);
  console.log(`Total transfers: ${allTransfers.length}`);
  
  const sent = allTransfers.filter((t: any) => t.from === address).length;
  const received = allTransfers.filter((t: any) => t.to === address && t.from !== address).length;
  console.log(`Sent from address: ${sent}`);
  console.log(`Received at address: ${received}`);
  console.log(`Pages drained: ${pageCount}`);
  console.log(`Address: ${address}`);
}

const testAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
fetchWalletActivity(testAddress).catch(console.error);