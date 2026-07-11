"use client";

import { useState } from "react";
import { usePrivy, useSessionSigners } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { encodeFunctionData, parseUnits, zeroAddress, type Address } from "viem";
import {
  CHAIN,
  ERC20_ABI,
  ERC4626_ABI,
  TEST_TOKEN,
  TEST_VAULT,
} from "@/lib/config";

const SIGNER_ID = process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID ?? "";
// Opcional: si defines una policy en el dashboard, acota lo que el signer puede hacer.
const POLICY_ID = process.env.NEXT_PUBLIC_PRIVY_POLICY_ID ?? "";

export default function Home() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { client } = useSmartWallets();
  const { addSessionSigners } = useSessionSigners();

  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [signerAdded, setSignerAdded] = useState(false);
  const append = (line: string) => setLog((l) => [line, ...l]);

  const embeddedAddress = user?.wallet?.address;
  const smartWalletAddress = user?.smartWallet?.address as Address | undefined;

  const embedded = user?.linkedAccounts?.find(
    (a: any) => a.type === "wallet" && a.walletClientType === "privy",
  ) as any;
  const walletId = embedded?.id as string | undefined;

  // --- 1: tx patrocinada simple ---
  async function sendSponsored() {
    if (!client) return;
    setBusy(true);
    try {
      append("Enviando tx patrocinada (value 0 a la zero address)...");
      const txHash = await client.sendTransaction({ chain: CHAIN, to: zeroAddress, value: 0n });
      append(`OK · txHash: ${txHash}`);
      append(`https://sepolia.basescan.org/tx/${txHash}`);
    } catch (e) {
      append(`ERROR: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // --- 2: batch approve + deposit desde el FRONT (usuario lo ordena) ---
  async function batchApproveDeposit() {
    if (!client || !smartWalletAddress) return;
    if (!TEST_TOKEN || !TEST_VAULT) {
      append("Configura NEXT_PUBLIC_TEST_TOKEN y NEXT_PUBLIC_TEST_VAULT en .env.local");
      return;
    }
    setBusy(true);
    try {
      const amount = parseUnits("1", 6);
      append("Front: enviando batch approve + deposit en una sola UserOp...");
      const txHash = await client.sendTransaction({
        calls: [
          {
            to: TEST_TOKEN as Address,
            data: encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [TEST_VAULT as Address, amount] }),
          },
          {
            to: TEST_VAULT as Address,
            data: encodeFunctionData({ abi: ERC4626_ABI, functionName: "deposit", args: [amount, smartWalletAddress] }),
          },
        ],
      });
      append(`OK · txHash: ${txHash}`);
      append(`https://sepolia.basescan.org/tx/${txHash}`);
    } catch (e) {
      append(`ERROR: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // --- 3: anadir nuestra app como SESSION SIGNER (con policy opcional) ---
  async function addSigner() {
    if (!embeddedAddress) return;
    if (!SIGNER_ID) {
      append("Falta NEXT_PUBLIC_PRIVY_SIGNER_ID en .env.local.");
      return;
    }
    setBusy(true);
    try {
      append(POLICY_ID ? "Anadiendo session signer (con policy)..." : "Anadiendo session signer...");
      await addSessionSigners({
        address: embeddedAddress,
        signers: [POLICY_ID ? { signerId: SIGNER_ID, policyIds: [POLICY_ID] } : { signerId: SIGNER_ID }],
      });
      setSignerAdded(true);
      append("OK · session signer anadido. El backend ya puede operar tu wallet.");
    } catch (e) {
      const msg = (e as Error).message;
      if (/already|exists/i.test(msg)) {
        setSignerAdded(true);
        append("El signer ya estaba anadido. Listo.");
      } else {
        append(`ERROR: ${msg}`);
      }
    } finally {
      setBusy(false);
    }
  }

  // --- 4: el BACKEND firma un mensaje por ti (sin popup) ---
  async function backendSign() {
    if (!walletId) return append("No tengo walletId.");
    setBusy(true);
    try {
      append("Backend: firmando mensaje por ti (sin popup)...");
      const res = await fetch("/api/server-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "fallo backend");
      append(`OK · firma del BACKEND: ${data.signature}`);
    } catch (e) {
      append(`ERROR: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // --- 5: el BACKEND deposita en el vault por ti (el Sidecar de verdad) ---
  async function backendDeposit() {
    if (!walletId || !smartWalletAddress) return append("Faltan walletId / smart wallet.");
    setBusy(true);
    try {
      append("Backend: approve + deposit en el vault EN TU NOMBRE (sponsored, sin popup)...");
      const res = await fetch("/api/server-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId, smartWalletAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "fallo backend");
      append(`OK · el BACKEND ejecuto el deposito: ${JSON.stringify(data.result)}`);
      append("^ Esto es el Sidecar: opero tu smart wallet sin ti, gas $0, sin popup.");
    } catch (e) {
      append(`ERROR: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <Shell>Cargando Privy...</Shell>;

  if (!authenticated) {
    return (
      <Shell>
        <p>Sandbox de smart wallets · Base Sepolia</p>
        <button onClick={login} style={btn}>Login con email</button>
      </Shell>
    );
  }

  return (
    <Shell>
      <Row label="Embedded wallet (signer)" value={embeddedAddress ?? "creando..."} />
      <Row label="Smart wallet (ERC-4337)" value={smartWalletAddress ?? "provisionando..."} />
      <Row label="Session signer anadido" value={signerAdded ? "SI" : "NO"} />

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={sendSponsored} disabled={busy || !client} style={btn}>1 · Tx patrocinada</button>
        <button onClick={batchApproveDeposit} disabled={busy || !client} style={btn}>2 · Batch (front)</button>
        <button onClick={addSigner} disabled={busy || signerAdded} style={btn}>3 · Anadir session signer</button>
        <button onClick={backendSign} disabled={busy || !walletId} style={btn}>4 · Backend firma</button>
        <button onClick={backendDeposit} disabled={busy || !walletId || !smartWalletAddress} style={btn}>5 · Backend deposita (Sidecar)</button>
        <button onClick={logout} style={{ ...btn, opacity: 0.6 }}>Logout</button>
      </div>

      <pre style={logBox}>{log.join("\n") || "Logs apareceran aqui..."}</pre>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 760, margin: "60px auto", padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>WRAP · Privy Smart Wallets</h1>
      {children}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ opacity: 0.6 }}>{label}: </span>
      <span style={{ wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "#2b6cff",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const logBox: React.CSSProperties = {
  marginTop: 24,
  background: "#11131a",
  border: "1px solid #222633",
  borderRadius: 8,
  padding: 16,
  whiteSpace: "pre-wrap",
  fontSize: 13,
  minHeight: 120,
};
