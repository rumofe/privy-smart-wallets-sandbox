"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { CHAIN, PRIVY_APP_ID } from "@/lib/config";

// Envolvemos toda la app con Privy. Dos capas:
//  - PrivyProvider: auth (email) + embedded wallet (el signer, sin seed phrase).
//  - SmartWalletsProvider: la smart account ERC-4337 encima del embedded wallet.
//    El sponsorship de gas y la implementacion (Safe) se configuran en el
//    dashboard de Privy, no aqui en el codigo.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Crea el embedded wallet automaticamente al hacer login si el user no tiene.
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
