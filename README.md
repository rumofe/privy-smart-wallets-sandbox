# WRAP · Privy Smart Wallets test

Sandbox para **validar la arquitectura** antes de tocar la app real (`nexus_invest`):
smart wallets de Privy + **Base Sepolia** + el **patron de la integracion Morpho**
(approve + deposit batcheados en una sola UserOp).

No es codigo de produccion. Es para entender y de-risquear la decision.

## Que valida

1. **Tx patrocinada** desde la smart wallet → el usuario paga **$0 de gas**
   (valida: smart wallet ERC-4337 + Base + gas sponsorship).
2. **Batch approve + deposit** en una sola transaccion → es **exactamente** como
   meteriais EURC/USDC en un vault de Morpho (ERC-4626). Valida que las smart
   wallets baten operaciones atomicamente.

(El **backend** que firma en nombre del usuario via delegated actions —el check
critico— es el **paso siguiente**, en un repo aparte.)

## Setup

### 1. Privy dashboard (lo haces tu, son tus secrets)

1. Crea una app en https://dashboard.privy.io
2. **Smart Wallets** → activar → implementacion **Safe** → red **Base Sepolia**.
3. **Gas sponsorship** → activa el paymaster para Base Sepolia
   (Privy trae uno de testnet; o mete una API key de Pimlico).
4. Copia el **App ID**.

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
# Pega tu NEXT_PUBLIC_PRIVY_APP_ID
```

### 3. Arrancar

```bash
npm install
npm run dev
# http://localhost:3000
```

### 4. Probar

1. **Login con email** → Privy crea el embedded wallet y provisiona la smart wallet.
2. Veras las dos direcciones (signer + smart wallet).
3. Pulsa **"1 · Tx patrocinada"** → deberia salir un txHash y verse en
   https://sepolia.basescan.org sin que pagues gas.
4. (Opcional) Para el boton **2 (batch Morpho)** necesitas un ERC-20 de test y un
   vault ERC-4626 de test en Base Sepolia → ponlos en `.env.local`
   (`NEXT_PUBLIC_TEST_TOKEN`, `NEXT_PUBLIC_TEST_VAULT`).

## Notas

- Si la tx patrocinada falla por gas, revisa que el **paymaster de Base Sepolia**
  este activado en el dashboard de Privy.
- La smart wallet tarda un momento en provisionarse tras el primer login.
