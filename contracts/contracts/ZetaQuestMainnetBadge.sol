// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract ZetaQuestMainnetBadge is ERC721, Ownable {
    using Strings for uint256;
    using Strings for uint32;

    struct Proof {
        uint32 world;
        uint256 xpSnapshot;
        uint64 ts;
        address player;
    }

    uint256 public nextId = 1;
    mapping(address => uint256) public claimedTokenId; // 0 si no minteó
    mapping(uint256 => Proof) public proofs;

    // Imagen IPFS fija (tu CID)
    string public constant IMAGE_CID = "bafybeiaabedjcwp6ecnf25jjhf5ffcewzdjk7ibu7ozx3x6rsjh2b76obe";

    event MainnetBadgeMinted(address indexed player, uint256 indexed tokenId, uint32 world, uint256 xpSnapshot, uint64 ts);

    // OZ v5: Ownable recibe initialOwner en el constructor
    constructor() ERC721("ZetaQuest Mainnet Badge", "ZQMB") Ownable(msg.sender) {}

    function claimBadge(uint32 world, uint256 xpSnapshot) external returns (uint256 tokenId) {
        require(claimedTokenId[msg.sender] == 0, "already-claimed");
        tokenId = nextId++;
        _safeMint(msg.sender, tokenId);

        Proof memory p = Proof({
            world: world,
            xpSnapshot: xpSnapshot,
            ts: uint64(block.timestamp),
            player: msg.sender
        });
        proofs[tokenId] = p;
        claimedTokenId[msg.sender] = tokenId;

        emit MainnetBadgeMinted(msg.sender, tokenId, world, xpSnapshot, p.ts);
    }

    /** =========================================================
     *  SOULBOUND en OZ v5:
     *  - Bloqueamos transferencias overrideando _update(...)
     *  - Bloqueamos aprobaciones overrideando _approve(...)
     *  ========================================================= */

    // Bloquea transferencias: permite solo mint (from == 0) y burn (to == 0)
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        // Si ya existe dueño, lo leemos antes de transferir
        address currentOwner = _ownerOf(tokenId);
        bool isMint = (currentOwner == address(0));
        bool isBurn = (to == address(0));

        if (!isMint && !isBurn) {
            revert("SBT: non-transferable");
        }

        // Ejecuta flujo normal de OZ (mint o burn)
        from = super._update(to, tokenId, auth);
    }

    // Bloquea aprobaciones
    function _approve(address to, uint256 tokenId, address auth, bool emitEvent)
        internal
        override
    {
        revert("SBT: approvals disabled");
    }

    /* ========= tokenURI ========= */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // ownerOf revertirá si el token no existe
        ownerOf(tokenId);
        Proof memory p = proofs[tokenId];

        bytes memory json = abi.encodePacked(
            "{",
              "\"name\":\"ZetaQuest Mainnet Badge #", tokenId.toString(), "\",",
              "\"description\":\"Proof of Mainnet usage on ZetaChain. Soulbound.\",",
              "\"image\":\"ipfs://", IMAGE_CID, "\",",
              "\"attributes\":[",
                "{\"trait_type\":\"World\",\"value\":\"", uint256(p.world).toString(), "\"},",
                "{\"trait_type\":\"XP Snapshot\",\"value\":\"", p.xpSnapshot.toString(), "\"},",
                "{\"trait_type\":\"Timestamp\",\"value\":\"", uint256(p.ts).toString(), "\"}",
              "]",
            "}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }
}

