"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { MAINNET_BADGE_ABI } from "../app/lib/abi/mainnetBadge";

const BADGE_ADDRESS = process.env.NEXT_PUBLIC_BADGE_ADDRESS as `0x${string}`;

type Props = { worldId: number; xpSnapshot: number };

export default function MainnetBadge({ worldId, xpSnapshot }: Props) {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const isMainnet = chainId === 7000;

  const { data: claimedIdRaw, refetch } = useReadContract({
    address: BADGE_ADDRESS,
    abi: MAINNET_BADGE_ABI,
    functionName: "claimedTokenId",
    args: [address ?? `0x0000000000000000000000000000000000000000`],
    query: { enabled: Boolean(address && BADGE_ADDRESS) },
  });

  const claimedId = useMemo(() => {
    try { return BigInt(claimedIdRaw as any); } catch { return 0n; }
  }, [claimedIdRaw]);

  const { writeContract, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (isSuccess) refetch(); }, [isSuccess, refetch]);

  const IMG = "https://ipfs.io/ipfs/bafybeiaabedjcwp6ecnf25jjhf5ffcewzdjk7ibu7ozx3x6rsjh2b76obe";

  const disabledMint = !isConnected || !isMainnet || isPending || waiting || !BADGE_ADDRESS;

  function handleSwitch() {
    try { switchChain({ chainId: 7000 }); } catch (e) { console.warn(e); }
  }

  function mint() {
    if (!address) return;
    writeContract(
      {
        address: BADGE_ADDRESS,
        abi: MAINNET_BADGE_ABI,
        functionName: "claimBadge",
        args: [worldId >>> 0, BigInt(Math.max(0, xpSnapshot))],
      },
      { onSuccess: (hash) => setTxHash(hash) }
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-[2px] rounded-full bg-emerald-500/20 border border-emerald-500/40 uppercase tracking-wider">
            Mainnet
          </span>
          <div className="font-pixel text-sm">ZetaQuest Badge</div>
        </div>
        {!isMainnet && <div className="text-[11px] opacity-75">Switch to ZetaChain Mainnet to mint</div>}
      </div>

      {claimedId > 0n ? (
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden ring-1 ring-white/10">
            <Image src={IMG} alt="Mainnet Badge" fill className="object-contain" unoptimized />
          </div>
          <div className="text-xs">
            <div>Minted: <span className="font-pixel">#{claimedId.toString()}</span></div>
            <div className="opacity-80">World: {worldId} • XP snapshot: {xpSnapshot}</div>
            {txHash && (
              <a className="underline opacity-80 hover:opacity-100"
                 href={`https://explorer.zetachain.com/tx/${txHash}`} target="_blank" rel="noreferrer">
                View tx
              </a>
            )}
          </div>
        </div>
      ) : !isMainnet ? (
        <button
          onClick={handleSwitch}
          disabled={!isConnected || switching}
          className={`font-press px-4 py-2 rounded-xl transition ${
            !isConnected || switching ? "bg-white/10 cursor-not-allowed" : "bg-amber-400 text-black hover:brightness-110"
          }`}
        >
          {switching ? "Switching…" : "Switch to Zeta Mainnet"}
        </button>
      ) : (
        <button
          onClick={mint}
          disabled={disabledMint}
          className={`font-press px-4 py-2 rounded-xl transition ${
            disabledMint ? "bg-white/10 cursor-not-allowed" : "bg-amber-400 text-black hover:brightness-110"
          }`}
        >
          {isPending || waiting ? "Minting…" : "Mint Mainnet Badge"}
        </button>
      )}
    </div>
  );
}
