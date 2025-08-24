"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseAbi, encodeFunctionData } from "viem";

const CORE_ADDRESS = process.env.NEXT_PUBLIC_CORE_ADDRESS as `0x${string}`;
const DEFAULT_DST_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DST_CHAIN_ID || "80002");
const DST_CONTRACT = process.env.NEXT_PUBLIC_DST_CONTRACT as `0x${string}`;

const CORE_ABI = parseAbi([
  "function travelTo(uint256 dstChainId, address dstContract, uint256 gasLimit) external",
]);

type Props = {
  dstChainId?: number;
  gasLimit?: bigint;
};

export default function TravelButton({ dstChainId, gasLimit }: Props) {
  const { isConnected } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const { writeContract, isPending } = useWriteContract();

  // Esperamos receipt
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  // 🔧 Cuando la tx se confirma → dispara eventos en un effect (no en render)
  useEffect(() => {
    if (isSuccess && txHash) {
      const world = dstChainId ?? DEFAULT_DST_CHAIN_ID;
      window.dispatchEvent(new CustomEvent("zq:sync"));
      window.dispatchEvent(new CustomEvent("zq:travel:done", { detail: { world } }));
      setTxHash(undefined);
    }
  }, [isSuccess, txHash, dstChainId]);

  const disabled = !isConnected || isPending || waiting;

  async function handleTravel() {
    const world = dstChainId ?? DEFAULT_DST_CHAIN_ID;
    const gl = gasLimit ?? 500_000n;

    const calldata = encodeFunctionData({
      abi: CORE_ABI,
      functionName: "travelTo",
      args: [BigInt(world), DST_CONTRACT, gl],
    });

    writeContract(
      {
        address: CORE_ADDRESS,
        abi: CORE_ABI,
        functionName: "travelTo",
        args: [BigInt(world), DST_CONTRACT, gl],
      },
      {
        onSuccess: (hash) => setTxHash(hash),
      }
    );
  }

  return (
    <button
      onClick={handleTravel}
      disabled={disabled}
      className={`font-press px-4 py-2 rounded-xl transition ${
        disabled ? "bg-white/10 cursor-not-allowed" : "bg-cyan-400 text-black hover:brightness-110"
      }`}
      title={!isConnected ? "Connect your wallet" : "Send cross-chain travel"}
    >
      {isPending || waiting ? "Traveling…" : "Travel (on-chain)"}
    </button>
  );
}






