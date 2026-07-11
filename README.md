# Privy Smart Wallets Sandbox

An **account abstraction (ERC-4337) sandbox** that validates a non-custodial wallet
architecture end to end: **Privy smart wallets** on **Base**, gas-sponsored
transactions, atomically batched `UserOperation`s, and a **backend that operates
the user's wallet through a scoped session signer** — without ever holding the
user's keys.

Built as an architecture spike to de-risk the wallet layer of a non-custodial
investing product before committing to it in production.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![ERC--4337](https://img.shields.io/badge/ERC--4337-Account%20Abstraction-6f42c1)
![Base](https://img.shields.io/badge/Base-Sepolia-0052ff)

---

## What it demonstrates

Each concept below maps to a button in the demo UI, so you can see it working
against a live testnet:

| # | Demo | Concept proven |
|---|------|----------------|
| 1 | **Sponsored transaction** | Gasless UX — a paymaster covers gas, the user pays **$0** (ERC-4337 + Base + gas sponsorship) |
| 2 | **Batch approve + deposit (client)** | Two calls settle in a **single atomic `UserOperation`** — the exact pattern for funding an ERC-4626 (Morpho) vault |
| 3 | **Add session signer** | Delegating **bounded** authority to a backend key, optionally constrained by a dashboard **policy** (contract allowlist) |
| 4 | **Backend signs a message** | Server-side signing with the authorization key — no user popup, secret never leaves the backend |
| 5 | **Backend deposit ("Sidecar")** | The backend runs `approve + deposit` **on the user's behalf**, gas-sponsored, no popup — a delegated on-chain action |

The interesting one is **#5**. It shows a backend automating on-chain actions for
a user *without custody*: the server can only do what the session signer was
granted (and a policy can restrict it to specific contracts), and the user's
signing key stays inside Privy's TEE the whole time.

## Architecture

Three actors, and the security boundary between them is the whole point:

```
┌─────────────┐   owns    ┌──────────────────────┐
│  Embedded   │──────────▶│   Smart wallet       │   ← holds funds, ERC-4337
│  wallet     │  (signer) │   (ERC-4337 account) │
│  (EOA, TEE) │           └──────────────────────┘
└─────────────┘                     ▲
      │ grants a scoped             │ operates within granted scope
      │ session signer              │ (gas-sponsored, no popup)
      ▼                             │
┌──────────────────────────────────┴──┐
│  Backend ("Sidecar")                 │   ← holds an authorization key,
│  Next.js API routes + @privy-io/node │     NOT the user's key
└──────────────────────────────────────┘
```

- The **embedded wallet** is the user's signer, held in Privy's TEE — the app
  never sees the private key.
- The **smart wallet** is the ERC-4337 account that holds funds and executes
  batched, sponsored operations.
- The **backend** holds a separate *authorization key*. Once the user adds it as
  a **session signer** (demo #3), it can act for the user — but only within the
  granted scope, so this stays **non-custodial**: the backend can never move
  funds outside what it was authorized to do, and never holds the user's key.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Privy** — `@privy-io/react-auth` (client), `@privy-io/node` + `@privy-io/server-auth` (backend)
- **viem** + **permissionless** for ERC-4337 encoding
- **Base Sepolia** testnet; **ERC-4626** vault interaction (Morpho pattern)

## Running it locally

### Prerequisites — a Privy app (your own keys)

1. Create an app at [dashboard.privy.io](https://dashboard.privy.io).
2. **Smart Wallets** → enable → **Safe** implementation → network **Base Sepolia**.
3. **Gas sponsorship** → enable the paymaster for Base Sepolia (Privy provides a
   testnet one; or plug in a Pimlico key).
4. For the backend demos (#3–#5): create an **authorization key** (session signer)
   under Settings → get its **ID** and **private key**.

### Setup

```bash
cp .env.local.example .env.local   # fill in your own values (see the file)
npm install
npm run dev                        # http://localhost:3000
```

Log in with email → Privy provisions the embedded wallet and the smart wallet.
You'll see both addresses, then the five demo buttons.

### Optional — the batch/vault demos (#2, #5)

These need a test ERC-20 and an ERC-4626 vault on Base Sepolia. `contracts/Mocks.sol`
provides a mintable `MockUSDC` and a 1:1 `MockVault`; deploy them in ~2 minutes with
Remix (no local toolchain) following [`contracts/README.md`](contracts/README.md),
then set `NEXT_PUBLIC_TEST_TOKEN` and `NEXT_PUBLIC_TEST_VAULT` in `.env.local`.

## Security notes

- **No secrets in the repo.** All keys are read from `.env.local` (gitignored);
  `.env.local.example` documents them with empty placeholders.
- Backend-only secrets (`PRIVY_APP_SECRET`, `PRIVY_AUTHORIZATION_KEY`) have **no**
  `NEXT_PUBLIC_` prefix, so they are read only in the API routes and never shipped
  to the browser bundle.
- Testnet only (Base Sepolia). This is a validation sandbox, not production code —
  a production deployment would additionally scope the session signer with a strict
  policy and add a forced-withdrawal path so users can always exit without the backend.
