# Test mocks (Base Sepolia)

`Mocks.sol` provides two contracts to validate the approve + deposit pattern
(buttons 2 and 5) with no external dependencies:

- **MockUSDC** — ERC-20 with a public `mint`, 6 decimals (like USDC).
- **MockVault** — ERC-4626-style vault; `deposit(assets, receiver)` mints shares 1:1.

## Quick deploy with Remix (no local toolchain)

1. Open [remix.ethereum.org](https://remix.ethereum.org) → create a file `Mocks.sol` → paste the contents.
2. **Compile** (compiler 0.8.20+).
3. **Deploy & Run** tab → Environment: **Injected Provider** (MetaMask on **Base Sepolia**;
   you need some test ETH from a Base Sepolia faucet).
4. Deploy **MockUSDC** → copy its address.
5. Deploy **MockVault** passing the MockUSDC address as the constructor arg (`_asset`) →
   copy its address.
6. On MockUSDC, call **`mint(yourSmartWallet, 1000000000)`** to give yourself 1,000 mUSDC
   (1,000 * 1e6) on your **smart wallet** (the one shown in the app, NOT the embedded wallet).
7. In `.env.local`:
   ```
   NEXT_PUBLIC_TEST_TOKEN=<MockUSDC address>
   NEXT_PUBLIC_TEST_VAULT=<MockVault address>
   ```
8. Restart `npm run dev`.

## Try it

- **Button 2** (client): you issue the approve + deposit (with a confirmation popup).
- **Button 5** (backend): the Sidecar runs approve + deposit ON YOUR BEHALF, sponsored,
  no popup. Look up the tx on [sepolia.basescan.org](https://sepolia.basescan.org) — it has 2 internal calls.

After depositing, your smart wallet's mUSDC balance goes down and its vault shares go up.
