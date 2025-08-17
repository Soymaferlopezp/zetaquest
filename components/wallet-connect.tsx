"use client";

import dynamic from "next/dynamic";
import React, { useEffect } from "react";
import { useAccount } from "wagmi";
import { usePathname, useRouter } from "next/navigation";

// Renderiza el custom element <w3m-button/> sin SSR
const W3MButton = dynamic(
  async () => (props: any) => React.createElement("w3m-button", props),
  { ssr: false }
);

export default function WalletConnect({
  redirectToOnConnect,
  redirectToOnDisconnect,
}: {
  redirectToOnConnect?: string;
  redirectToOnDisconnect?: string;
}) {
  const { isConnected, address, status } = useAccount();
  const router = useRouter();
  const pathname = usePathname();

  // Al CONECTAR: identificar player por address + redir opcional
  useEffect(() => {
    (async () => {
      if (!isConnected || !address) return;
      try {
        await fetch(`/api/player?address=${address}`, { cache: "no-store" });
      } catch {}
      if (redirectToOnConnect && pathname !== redirectToOnConnect) {
        router.push(redirectToOnConnect);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  // Al DESCONCTAR en el dashboard: redir sí o sí
  useEffect(() => {
    if (redirectToOnDisconnect && status === "disconnected") {
      router.replace(redirectToOnDisconnect);
    }
  }, [status, redirectToOnDisconnect, router]);

  return <W3MButton size="md" balance="hide" />;
}

