import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";

// Runs ONLY on the server. The App Secret and the authorization private key
// never reach the browser. This is the minimal equivalent of the "Sidecar".
const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  appSecret: process.env.PRIVY_APP_SECRET ?? "",
});

// POST /api/server-sign  ·  Body: { walletId: string }
// Signs a message ON BEHALF of the user, without them present and WITHOUT a popup.
// It works because:
//   1) the user added our authorization key as a session signer (client), and
//   2) here we pass the private key of that same key in the authorization_context.
export async function POST(req: NextRequest) {
  try {
    const { walletId } = await req.json();
    if (!walletId) {
      return NextResponse.json({ error: "walletId required" }, { status: 400 });
    }

    const response = await privy
      .wallets()
      .ethereum()
      .signMessage(walletId, {
        message: "The backend is signing on behalf of the user",
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
