"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseAbi } from "viem";

const CORE_ADDRESS = process.env.NEXT_PUBLIC_CORE_ADDRESS as `0x${string}` | undefined;
const CORE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CORE_CHAIN_ID || "7001");   // Athens
const DEFAULT_DST_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DST_CHAIN_ID || "80002"); // Amoy

// Si no tienes DST_CONTRACT, usamos address(0) porque tu Core no lo usa.
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const DST_CONTRACT_ENV = process.env.NEXT_PUBLIC_DST_CONTRACT as `0x${string}` | undefined;
const DST_CONTRACT: `0x${string}` = (DST_CONTRACT_ENV ?? ZERO_ADDR) as `0x${string}`;

const CORE_ABI = parseAbi([
  "function travelTo(uint256 dstChainId, address dstContract, uint256 gasLimit) external payable"
]);

type Props = {
  dstChainId?: number;
  gasLimit?: bigint;
};

export default function TravelButton({ dstChainId, gasLimit }: Props) {
  const { isConnected } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [uiError, setUiError] = useState<string | null>(null);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const clickLock = useRef(false);

  const { writeContractAsync, isPending } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  // Antes pedías DST_CONTRACT sí o sí; ya no hace falta.
  const hasEnv = Boolean(CORE_ADDRESS && CORE_CHAIN_ID);

  const targetWorld = useMemo(
    () => (Number.isFinite(dstChainId) ? (dstChainId as number) : DEFAULT_DST_CHAIN_ID),
    [dstChainId]
  );

  // Explica por qué no se puede clickear
  useEffect(() => {
    if (!isConnected) return setDisabledReason("Connect your wallet");
    if (!hasEnv) return setDisabledReason("Missing env: NEXT_PUBLIC_CORE_ADDRESS / CORE_CHAIN_ID");
    if (isPending || waiting) return setDisabledReason("Transaction in progress");
    setDisabledReason(null);
  }, [isConnected, hasEnv, isPending, waiting]);

  const disabled = !isConnected || isPending || waiting || !hasEnv;

  const handleTravel = useCallback(async () => {
    setUiError(null);
    if (!CORE_ADDRESS || !CORE_CHAIN_ID) {
      setUiError("Missing env (CORE_ADDRESS / CORE_CHAIN_ID)");
      return;
    }
    if (clickLock.current) return;
    clickLock.current = true;

    try {
      const gl = gasLimit ?? 500_000n;

      const hash = await writeContractAsync({
        address: CORE_ADDRESS,
        abi: CORE_ABI,
        functionName: "travelTo",
        args: [BigInt(targetWorld), DST_CONTRACT, gl],
        chainId: CORE_CHAIN_ID, // fuerza 7001 (o lo que pongas en env)
      });

      setTxHash(hash);
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Travel failed";
      setUiError(msg);
      clickLock.current = false;
    }
  }, [gasLimit, targetWorld, writeContractAsync]);

  useEffect(() => {
    if (isSuccess && txHash) {
      window.dispatchEvent(new Event("zq:sync"));
      window.dispatchEvent(new CustomEvent("zq:travel:done", { detail: { world: targetWorld } }));
      setTxHash(undefined);
      clickLock.current = false;
    }
  }, [isSuccess, txHash, targetWorld]);

  useEffect(() => {
    if (!isPending && !waiting) clickLock.current = false;
  }, [isPending, waiting]);

  return (
    <div className="w-full">
      <button
        onClick={handleTravel}
        disabled={disabled}
        className={`font-press w-full px-4 py-2 rounded-xl transition ${
          disabled ? "bg-white/10 cursor-not-allowed" : "bg-cyan-400 text-black hover:brightness-110"
        }`}
        title={disabledReason ?? "Send cross‑chain travel"}
      >
        {isPending || waiting ? "Traveling…" : `Travel (on‑chain)`}
      </button>

      {/* Razón visible (útil para jueces/devs) */}
      {(disabledReason || uiError) && (
        <p className="mt-2 text-xs break-words" style={{ color: "#ffb4b4" }}>
          {disabledReason || uiError}
        </p>
      )}

      {/* Debug opcional: quítalo si no quieres mostrarlo */}
    {/*  <div className="mt-2 text-[10px] opacity-60">
        <div>core: {CORE_ADDRESS ?? "(missing)"}</div>
        <div>dst: {DST_CONTRACT_ENV ?? "0x0 (unused)"}</div>
        <div>coreChainId: {CORE_CHAIN_ID}</div>
        <div>dstChainId: {targetWorld}</div>
      </div> */}
    </div>
  );
}






