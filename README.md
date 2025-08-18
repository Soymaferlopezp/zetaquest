# ZetaQuest 🗺️⚔️

**RPG-lite** on-chain que demuestra **Universal Smart Contracts** y **cross-chain** en **ZetaChain** (Athens 7001).
Mintea tu **Traveler** (NFT) y completa **quests** generadas (MVP), ganando **ZetaPoints** con buffs por blockchain.

## Demo Flow

1. **Landing** (`/`): conecta tu wallet → **/after-connect**.
2. **After Connect**: si ya tienes NFT → **/app**, si no → **/mint**.
3. **Mint** (`/mint`): mintea el Traveler → confetti 🎉 → **/app**.
4. **Dashboard** (`/app`): HUD (WORLD / BUFF / STATS), viaja entre ETH/POL/BNB y completa quests (MVP off-chain).

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TailwindCSS, shadcn/ui (mínimo), Tipografías “Pixel Emulator” / “Press Start 2P”
- **Web3**: wagmi + Web3Modal (WalletConnect), viem
- **Chain**: ZetaChain Athens (7001)
- **Smart Contracts**: Hardhat + OpenZeppelin v5 (`ERC721Enumerable`, `Ownable`)
- **API**: Next.js Route Handlers (`/api/player`, `/api/quests`, etc.)

## Estructura

```bash
zetaquest/
├─ app/
│ ├─ (marketing)/page.tsx # Landing
│ ├─ after-connect/page.tsx # Checker NFT -> /mint | /app
│ ├─ mint/page.tsx # Mint + confetti
│ ├─ app/page.tsx # Dashboard
│ ├─ components/wallet-connect.tsx
│ ├─ lib/
│ │ ├─ abi/zetaquestNft.ts
│ │ └─ zeta.ts # RPC fijo Athens para guards
│ ├─ api/
│ │ ├─ health/route.ts
│ │ ├─ player/route.ts
│ │ ├─ player/travel/route.ts
│ │ ├─ player/xp/route.ts
│ │ └─ quests/new/route.ts
│ ├─ providers.tsx # Wagmi + Query Client + Web3Modal
│ ├─ layout.tsx
│ └─ globals.css
├─ public/art/ # assets (bg, traveler, confetti, etc.)
├─ contracts/
│ ├─ contracts/ZetaQuestNFT.sol
│ ├─ scripts/deploy.js
│ ├─ hardhat.config.js
│ └─ .env # PRIVATE_KEY=...
├─ .gitignore
├─ README.md
└─ package.json
```

## Requisitos

- Node.js 18+ (probado con 22.x)
- npm
- Cuenta en WalletConnect (project id)

## Variables de entorno

**Frontend (`.env.local`):**
NEXT_PUBLIC_WALLETCONNECT_ID=...
NEXT_PUBLIC_NFT_ADDRESS=0xDirecciónDelContrato
NEXT_PUBLIC_ZETA_TESTNET=7001

ruby
Copiar
Editar

**Contracts (`contracts/.env`):**
PRIVATE_KEY=0xTuClavePrivadaTestnet

shell
Copiar
Editar

## Instalación & Dev

```bash
# en la raíz
npm install
npm run dev
# abre http://localhost:3000
```

## Despliegue del contrato (Zeta Athens 7001)
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network zetachain_testnet
# copia la dirección y pégala en NEXT_PUBLIC_NFT_ADDRESS

## Notas de diseño

Estilo pixel/fantasy minimalista con HUD superior (NFT • WORLD • BUFF • STATS).

public/art/traveler-{normal|rare|epic}.png → usado por tokenURI.

Confetti al mintear (/art/confetti.gif).

## Roadmap

✅ MVP: wallet connect, mint NFT, HUD, quests off-chain

⏭️ Integración Gemini para quests dinámicas

⏭️ Universal Smart Contracts + mensajería cross-chain (aplicar buffs on-chain)

⏭️ ZetaPoints/insignias on-chain

⏭️ Perfil jugador persistente (DB/Prisma o KV)

⏭️ UI: animaciones de raridad (Epic glow), panel de logros

## Licencia

MIT — usar con atribución. Activos visuales bajo licencia del equipo de ZetaQuest.

## ZetaQuest – Flujo MVP

```bash
┌──────────┐
│ Landing  │  Usuario conecta wallet (Web3Modal)
└────┬─────┘
     │ redirectToOnConnect
     v
┌───────────────┐
│ /after-connect│
│ - Lee balance │ (RPC fijo Athens 7001)
└───┬───────┬───┘
    │has NFT│no NFT
    v       v
┌────────┐  ┌────────┐
│ /app   │  │ /mint  │
└──┬─────┘  └──┬─────┘
   │           │ Mint (switch chain a 7001 si hace falta)
   │           │ Espera receipt tolerante + confetti 🎉
   │           v
   │        ┌────────┐
   │        │  /app  │
   │        └───┬────┘
   │            │
   │   HUD (NFT | WORLD | BUFF | STATS)
   │   Travel ETH / POL / BNB
   │   Quests (new/complete, XP por chain)
   │            │
   └────────────┘
```