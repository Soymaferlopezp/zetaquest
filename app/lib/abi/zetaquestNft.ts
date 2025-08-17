export const ZETAQUEST_NFT_ABI = [
  { "type":"function","name":"mint","inputs":[],"outputs":[],"stateMutability":"nonpayable" },
  { "type":"function","name":"balanceOf","inputs":[{"name":"owner","type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view" },
  { "type":"function","name":"tokenOfOwnerByIndex","inputs":[{"name":"owner","type":"address"},{"name":"index","type":"uint256"}],"outputs":[{"type":"uint256"}],"stateMutability":"view" },
  { "type":"function","name":"tokenURI","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[{"type":"string"}],"stateMutability":"view" }
] as const;
