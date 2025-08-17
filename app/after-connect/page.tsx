"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { createPublicClient, http } from "viem";
import { zetaAthens, zetaRpc } from "../lib/zeta";
import { ZETAQUEST_NFT_ABI } from "../lib/abi/zetaquestNft";

export default function AfterConnect() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS as `0x${string}` | undefined;

  useEffect(() => {
    (async () => {
      if (!isConnected || !address) return;
      if (!NFT_ADDRESS) {
        router.replace("/app"); // si no hay contrato configurado, deja pasar
        return;
      }

      const pc = createPublicClient({ chain: zetaAthens, transport: http(zetaRpc) });

      try {
        const bal: bigint = await pc.readContract({
          address: NFT_ADDRESS,
          abi: ZETAQUEST_NFT_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        router.replace(bal > 0n ? "/app" : "/mint");
      } catch {
        // si el RPC da guerra, manda a mint para que el user mintee
        router.replace("/mint");
      }
    })();
  }, [isConnected, address, NFT_ADDRESS, router]);

  return (
    <main className="min-h-screen grid place-items-center bg-black text-white">
      <div className="font-press text-sm opacity-70">Checking your Traveler…</div>
    </main>
  );
}

