"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { CHAIN, PRIVY_APP_ID } from "@/lib/config";

// Wrap the whole app with Privy. Two layers:
//  - PrivyProvider: auth (email) + embedded wallet (the signer, no seed phrase).
//  - SmartWalletsProvider: the ERC-4337 smart account on top of the embedded wallet.
//    Gas sponsorship and the implementation (Safe) are configured in the Privy
//    dashboard, not here in code.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Automatically create the embedded wallet on login if the user has none.
        embeddedWallets: { createOnLogin: "users-without-wallets" },
        defaultChain: CHAIN,
        supportedChains: [CHAIN],
        loginMethods: ["email"],
        appearance: { theme: "dark" },
      }}
    >
      <SmartWalletsProvider>{children}</SmartWalletsProvider>
    </PrivyProvider>
  );
}
