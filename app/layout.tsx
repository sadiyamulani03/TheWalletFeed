import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wallet Activity Feed",
  description:
    "Paste any address or ENS name and get its complete on-chain history in one clean feed. Every category, both directions, fully paginated.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}