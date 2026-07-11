import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Privy Smart Wallets Sandbox",
  description: "ERC-4337 smart wallets on Base Sepolia: sponsored txs, batched UserOps, session signers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          background: "#0a0b0f",
          color: "#e6e8ec",
          margin: 0,
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
