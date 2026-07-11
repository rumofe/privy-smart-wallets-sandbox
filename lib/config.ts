import { baseSepolia } from "viem/chains";
import type { Address } from "viem";

// Red de testing. Base Sepolia es gratis: el gas lo cubre el paymaster de Privy.
export const CHAIN = baseSepolia;

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

// Direcciones opcionales para el demo del patron Morpho (approve + deposit).
// Si estan vacias, el boton de batch queda deshabilitado.
export const TEST_TOKEN = (process.env.NEXT_PUBLIC_TEST_TOKEN ?? "") as Address | "";
export const TEST_VAULT = (process.env.NEXT_PUBLIC_TEST_VAULT ?? "") as Address | "";

// ABIs minimas: solo las funciones que usamos.
export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// ERC-4626 = el estandar de los vaults de Morpho (deposit/withdraw de un asset).
export const ERC4626_ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
] as const;
