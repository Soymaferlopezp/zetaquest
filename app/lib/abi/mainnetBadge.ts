export const MAINNET_BADGE_ABI = [
  { "type":"function","name":"claimBadge","stateMutability":"nonpayable","inputs":[
      { "name":"world","type":"uint32" },
      { "name":"xpSnapshot","type":"uint256" }
    ],"outputs":[{ "name":"tokenId","type":"uint256" }]},
  { "type":"function","name":"claimedTokenId","stateMutability":"view","inputs":[{ "name":"player","type":"address" }],"outputs":[{ "type":"uint256" }]},
  { "type":"function","name":"tokenURI","stateMutability":"view","inputs":[{ "name":"tokenId","type":"uint256"}],"outputs":[{ "type":"string"}]},
  { "type":"event","name":"MainnetBadgeMinted","inputs":[
      { "name":"player","type":"address","indexed":true },
      { "name":"tokenId","type":"uint256","indexed":true },
      { "name":"world","type":"uint32","indexed":false },
      { "name":"xpSnapshot","type":"uint256","indexed":false },
      { "name":"ts","type":"uint64","indexed":false }
    ] }
] as const;
