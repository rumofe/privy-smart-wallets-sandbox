import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";

// Corre SOLO en el servidor. El App Secret y la authorization private key nunca
// llegan al navegador. Esto es el equivalente de juguete a vuestro Sidecar.
const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  appSecret: process.env.PRIVY_APP_SECRET ?? "",
});

// POST /api/server-sign  ·  Body: { walletId: string }
// Firma un mensaje EN NOMBRE del usuario, sin que este presente y SIN popup.
// Funciona porque:
//   1) el usuario anadio nuestra authorization key como session signer (front), y
//   2) aqui pasamos la private key de esa misma key en el authorization_context.
export async function POST(req: NextRequest) {
  try {
    const { walletId } = await req.json();
    if (!walletId) {
      return NextResponse.json({ error: "walletId requerido" }, { status: 400 });
    }

    const response = await privy
      .wallets()
      .ethereum()
      .signMessage(walletId, {
        message: "WRAP: el backend esta firmando en nombre del usuario",
        authorization_context: {
          authorization_private_keys: [process.env.PRIVY_AUTHORIZATION_KEY ?? ""],
        },
      });

    const signature = (response as any).signature ?? JSON.stringify(response);
    return NextResponse.json({ signature });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
