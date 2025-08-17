// app/lib/zeta.ts
import { defineChain } from "viem";

export const zetaAthens = defineChain({
  id: 7001,
  name: "ZetaChain Athens",
  nativeCurrency: { name: "Zeta", symbol: "ZETA", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://zetachain-athens-evm.blockpi.network/v1/rpc/public"] },
    public:  { http: ["https://zetachain-athens-evm.blockpi.network/v1/rpc/public"] },
  },
});

export const zetaRpc = zetaAthens.rpcUrls.default.http[0];

