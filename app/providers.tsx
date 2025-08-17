"use client";

import { ReactNode, useEffect, useRef } from "react";
import { WagmiProvider, createConfig } from "wagmi";
import { mainnet, polygon, bsc } from "wagmi/chains";
import { defineChain, http } from "viem";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** ---------- Chains ---------- */
const zetachainMainnet = defineChain({
  id: 7000,
  name: "ZetaChain",
  nativeCurrency: { name: "Zeta", symbol: "ZETA", decimals: 18 },
  rpcUrls: { default: { http: ["https://zetachain-evm.blockpi.network/v1/rpc/public"] } },
  blockExplorers: { default: { name: "Zeta Explorer", url: "https://explorer.zetachain.com" } },
});

const zetachainTestnet = defineChain({
  id: 7001,
  name: "ZetaChain Testnet",
  nativeCurrency: { name: "Zeta", symbol: "ZETA", decimals: 18 },
  rpcUrls: { default: { http: ["https://zetachain-athens-evm.blockpi.network/v1/rpc/public"] } },
  blockExplorers: { default: { name: "Athens Explorer", url: "https://athens.explorer.zetachain.com" } },
});

const chains = [mainnet, polygon, bsc, zetachainTestnet, zetachainMainnet] as const;

/** ---------- wagmi config ---------- */
const wagmiConfig = createConfig({
  chains,
  multiInjectedProviderDiscovery: true,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [zetachainTestnet.id]: http("https://zetachain-athens-evm.blockpi.network/v1/rpc/public"),
    [zetachainMainnet.id]: http("https://zetachain-evm.blockpi.network/v1/rpc/public"),
  },
});

/** ---------- Inicializa Web3Modal solo en cliente y solo una vez ---------- */
function initWeb3ModalOnce() {
  if (typeof window === "undefined") return;
  if ((window as any).__w3mInited) return;

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID as string | undefined;
  if (!projectId) {
    console.warn("NEXT_PUBLIC_WALLETCONNECT_ID no configurado");
    return;
  }

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  createWeb3Modal({
    wagmiConfig,
    projectId,
    enableAnalytics: true,
    themeMode: "dark",
    metadata: {
      name: "ZetaQuest",
      description: "RPG-lite cross-chain on ZetaChain",
      url: appUrl,
      icons: ["/favicon.ico"],
    },
  });

  (window as any).__w3mInited = true;
}

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initWeb3ModalOnce();
  }, []);

  // ✅ QueryClient estable con valor inicial
  const queryClient = useRef(new QueryClient()).current;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}


