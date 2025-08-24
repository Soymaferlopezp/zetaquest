export const ZETAQUEST_CORE_ABI = [
  {
    type: "function",
    name: "getPlayerState",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ type: "uint256" }, { type: "uint256[3]" }]
  },
  {
    type: "function",
    name: "travelTo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dstChainId", type: "uint256" },
      { name: "dstAddress", type: "address" },
      { name: "gasLimit", type: "uint256" }
    ],
    outputs: []
  }
] as const;


