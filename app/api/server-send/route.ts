import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { encodeFunctionData, parseUnits, type Address } from "viem";

// El Sidecar de juguete: el BACKEND ejecuta una operacion onchain (approve +
// deposit en el vault) EN NOMBRE del usuario, patrocinada y sin popup.
const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  appSecret: process.env.PRIVY_APP_SECRET ?? "",
});

const TOKEN = (process.env.NEXT_PUBLIC_TEST_TOKEN ?? "") as Address;
const VAULT = (process.env.NEXT_PUBLIC_TEST_VAULT ?? "") as Address;

const ERC20_ABI = [
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

const ERC4626_ABI = [
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

// POST /api/server-send  ·  Body: { walletId, smartWalletAddress }
export async function POST(req: NextRequest) {
  try {
    const { walletId, smartWalletAddress } = await req.json();
    if (!walletId || !smartWalletAddress) {
      return NextResponse.json({ error: "walletId y smartWalletAddress requeridos" }, { status: 400 });
    }
    if (!TOKEN || !VAULT) {
      return NextResponse.json(
        { error: "Faltan NEXT_PUBLIC_TEST_TOKEN / NEXT_PUBLIC_TEST_VAULT (despliega los mocks)" },
        { status: 400 },
      );
    }

    const amount = parseUnits("1", 6); // 1 mUSDC

    // Mismo batch que el boton 2, pero lo ordena el BACKEND, no el usuario.
    const calls = [
      {
        to: TOKEN,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [VAULT, amount],
        }),
      },
      {
        to: VAULT,
        data: encodeFunctionData({
          abi: ERC4626_ABI,
          functionName: "deposit",
          args: [amount, smartWalletAddress as Address],
        }),
      },
    ];

    // sponsor: true -> Privy enruta por la smart wallet con paymaster (gas $0).
    // authorization_context -> firma con la session signer key (sin el usuario).
    const result = await privy
      .wallets()
      .ethereum()
      .sendCalls(walletId, {
        caip2: "eip155:84532", // Base Sepolia en formato CAIP-2
        sponsor: true,
        params: { calls },
        authorization_context: {
          authorization_private_keys: [process.env.PRIVY_AUTHORIZATION_KEY ?? ""],
        },
      } as any);

    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
