# Mocks para testing (Base Sepolia)

`Mocks.sol` tiene dos contratos para validar el patron approve + deposit
(botones 2 y 5) sin dependencias externas:

- **MockUSDC** — ERC-20 con `mint` publico, 6 decimales (como USDC).
- **MockVault** — vault estilo ERC-4626, `deposit(assets, receiver)` mintea shares 1:1.

## Despliegue rapido con Remix (sin instalar nada)

1. Abre https://remix.ethereum.org → crea un fichero `Mocks.sol` → pega el contenido.
2. **Compile** (compilador 0.8.20+).
3. Pestana **Deploy & Run** → Environment: **Injected Provider** (MetaMask en **Base Sepolia**;
   necesitas algo de ETH de test: faucet de Base Sepolia).
4. Despliega **MockUSDC** → copia su address.
5. Despliega **MockVault** poniendo en el constructor (`_asset`) la address de MockUSDC →
   copia su address.
6. En MockUSDC, llama a **`mint(tuSmartWallet, 1000000000)`** para darte 1.000 mUSDC
   (1.000 * 1e6) a tu **smart wallet** (la 0x6489... que ves en la app, NO el embedded).
7. En `.env.local`:
   ```
   NEXT_PUBLIC_TEST_TOKEN=<address de MockUSDC>
   NEXT_PUBLIC_TEST_VAULT=<address de MockVault>
   ```
8. Reinicia `npm run dev`.

## Probar
- **Boton 2** (front): tu ordenas el approve + deposit (con popup de confirmacion).
- **Boton 5** (backend): el Sidecar hace el approve + deposit EN TU NOMBRE, sponsored,
  sin popup. Mira en https://sepolia.basescan.org la tx con 2 internal calls.

Tras depositar, el balance de mUSDC de tu smart wallet baja y el de shares del vault sube.
