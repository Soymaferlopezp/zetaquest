// lib/abi/scoreV2.ts

export const SCORE_V2_ABI = [
  {
    type: "function",
    name: "addXp",
    stateMutability: "nonpayable",
    inputs: [
      { name: "player", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
