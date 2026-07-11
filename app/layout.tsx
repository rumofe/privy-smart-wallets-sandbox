import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "WRAP · Privy Smart Wallets test",
  description: "Sandbox: smart wallets + Base Sepolia + patron Morpho",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
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
