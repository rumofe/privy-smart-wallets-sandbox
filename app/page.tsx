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
// Optional: if you define a policy in the dashboard, it scopes what the signer can do.
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

  // --- 1: simple sponsored transaction ---
  async function sendSponsored() {
    if (!client) return;
    setBusy(true);
    try {
      append("Sending sponsored tx (value 0 to the zero address)...");
      const txHash = await client.sendTransaction({ chain: CHAIN, to: zeroAddress, value: 0n });
      append(`OK · txHash: ${txHash}`);
      append(`https://sepolia.basescan.org/tx/${txHash}`);
    } catch (e) {
      append(`ERROR: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // --- 2: batch approve + deposit from the CLIENT (user authorizes it) ---
  async function batchApproveDeposit() {
    if (!client || !smartWalletAddress) return;
    if (!TEST_TOKEN || !TEST_VAULT) {
      append("Set NEXT_PUBLIC_TEST_TOKEN and NEXT_PUBLIC_TEST_VAULT in .env.local");
      return;
    }
    setBusy(true);
    try {
      const amount = parseUnits("1", 6);
      append("Client: sending batch approve + deposit in a single UserOp...");
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

  // --- 3: add our app as a SESSION SIGNER (with optional policy) ---
  async function addSigner() {
    if (!embeddedAddress) return;
    if (!SIGNER_ID) {
      append("Missing NEXT_PUBLIC_PRIVY_SIGNER_ID in .env.local.");
      return;
    }
    setBusy(true);
    try {
      append(POLICY_ID ? "Adding session signer (with policy)..." : "Adding session signer...");
      await addSessionSigners({
        address: embeddedAddress,
        signers: [POLICY_ID ? { signerId: SIGNER_ID, policyIds: [POLICY_ID] } : { signerId: SIGNER_ID }],
      });
      setSignerAdded(true);
      append("OK · session signer added. The backend can now operate your wallet.");
    } catch (e) {
      const msg = (e as Error).message;
      if (/already|exists/i.test(msg)) {
        setSignerAdded(true);
        append("Signer was already added. Ready.");
      } else {
        append(`ERROR: ${msg}`);
      }
    } finally {
      setBusy(false);
    }
  }

  // --- 4: the BACKEND signs a message for you (no popup) ---
  async function backendSign() {
    if (!walletId) return append("No walletId available.");
    setBusy(true);
    try {
      append("Backend: signing a message for you (no popup)...");
      const res = await fetch("/api/server-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "backend failed");
      append(`OK · BACKEND signature: ${data.signature}`);
    } catch (e) {
      append(`ERROR: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // --- 5: the BACKEND deposits into the vault for you (the real "Sidecar") ---
  async function backendDeposit() {
    if (!walletId || !smartWalletAddress) return append("Missing walletId / smart wallet.");
    setBusy(true);
    try {
      append("Backend: approve + deposit into the vault ON YOUR BEHALF (sponsored, no popup)...");
      const res = await fetch("/api/server-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId, smartWalletAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "backend failed");
      append(`OK · the BACKEND executed the deposit: ${JSON.stringify(data.result)}`);
      append("^ This is the Sidecar: it operates your smart wallet without you, gas $0, no popup.");
    } catch (e) {
      append(`ERROR: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <Shell>Loading Privy...</Shell>;

  if (!authenticated) {
    return (
      <Shell>
        <p>Smart wallets sandbox · Base Sepolia</p>
        <button onClick={login} style={btn}>Log in with email</button>
      </Shell>
    );
  }

  return (
    <Shell>
      <Row label="Embedded wallet (signer)" value={embeddedAddress ?? "creating..."} />
      <Row label="Smart wallet (ERC-4337)" value={smartWalletAddress ?? "provisioning..."} />
      <Row label="Session signer added" value={signerAdded ? "YES" : "NO"} />

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={sendSponsored} disabled={busy || !client} style={btn}>1 · Sponsored tx</button>
        <button onClick={batchApproveDeposit} disabled={busy || !client} style={btn}>2 · Batch (client)</button>
        <button onClick={addSigner} disabled={busy || signerAdded} style={btn}>3 · Add session signer</button>
        <button onClick={backendSign} disabled={busy || !walletId} style={btn}>4 · Backend signs</button>
        <button onClick={backendDeposit} disabled={busy || !walletId || !smartWalletAddress} style={btn}>5 · Backend deposits (Sidecar)</button>
        <button onClick={logout} style={{ ...btn, opacity: 0.6 }}>Log out</button>
      </div>

      <pre style={logBox}>{log.join("\n") || "Logs will appear here..."}</pre>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 760, margin: "60px auto", padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>Privy Smart Wallets Sandbox</h1>
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
