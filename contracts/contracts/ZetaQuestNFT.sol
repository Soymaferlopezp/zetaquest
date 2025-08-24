// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

interface IZQCoreView {
    /// Debe devolver: world, atk, def, spd (buffs) para el tokenId
    function tokenWorldAndBuff(uint256 tokenId)
        external
        view
        returns (uint256 world, uint32 atk, uint32 def, uint32 spd);
}

contract ZetaQuestNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;

    enum Rarity { Normal, Rare, Epic }
    mapping(uint256 => Rarity) private _rarityOf;
    uint256 private _nextId = 1;

    string public baseImageURI; // e.g. https://ipfs.io/ipfs/bafybeid25uxtoc4dk7lga3fz7r5v3lqysyz5bcmfcusdxhfhfphx6jqb7e/traveler-
    address public core;        // ZetaQuestCore (en Athens)

    constructor(string memory _baseImageURI)
        ERC721("ZetaQuest Traveler", "ZQT")
        Ownable(msg.sender)
    {
        baseImageURI = _baseImageURI;
    }

    /* ---------------- Admin ---------------- */

    function setBaseImageURI(string calldata uri) external onlyOwner {
        baseImageURI = uri;
    }

    function setCore(address c) external onlyOwner {
        core = c;
    }

    /* --------------- Mint ------------------ */

    function mint() external {
        require(balanceOf(msg.sender) == 0, "One per address");
        uint256 id = _nextId++;

        uint256 rand = uint256(
            keccak256(abi.encodePacked(block.prevrandao, msg.sender, id, block.timestamp))
        );
        uint256 roll = rand % 100;
        Rarity r = Rarity.Normal;
        if (roll < 2) r = Rarity.Epic;        // 2%
        else if (roll < 20) r = Rarity.Rare;  // 18%
        _rarityOf[id] = r;

        _safeMint(msg.sender, id);
    }

    /* --------------- Views ----------------- */

    function getRarity(uint256 tokenId) external view returns (Rarity) {
        _requireOwned(tokenId);
        return _rarityOf[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        // Imagen solo depende de rareza (no cambiamos PNG)
        string memory rarityStr = _rarityToSlug(_rarityOf[tokenId]); // normal|rare|epic
        string memory image = string(abi.encodePacked(baseImageURI, rarityStr, ".png"));

        // Atributos base (rarity)
        bytes memory attrs = abi.encodePacked(
            '[{"trait_type":"rarity","value":"', _rarityToName(_rarityOf[tokenId]), '"}'
        );

        // Si hay Core configurado, intentamos traer world + buffs
        if (core != address(0)) {
            try IZQCoreView(core).tokenWorldAndBuff(tokenId) returns (
                uint256 world, uint32 atk, uint32 def, uint32 spd
            ) {
                attrs = abi.encodePacked(
                    attrs,
                    ',{"trait_type":"world","value":"', world.toString(), '"}',
                    ',{"trait_type":"buff_atk","value":"', uint256(atk).toString(), '"}',
                    ',{"trait_type":"buff_def","value":"', uint256(def).toString(), '"}',
                    ',{"trait_type":"buff_spd","value":"', uint256(spd).toString(), '"}'
                );
            } catch {
                // Si falla la llamada (no registrado aún, etc.), no agregamos esos atributos.
            }
        }

        // Cierra el array de atributos
        attrs = abi.encodePacked(attrs, "]");

        bytes memory json = abi.encodePacked(
            '{"name":"ZetaQuest Traveler #', tokenId.toString(),
            '","description":"RPG-lite cross-chain on ZetaChain.",',
            '"image":"', image, '",',
            '"attributes":', attrs,
            "}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    /* ------------- Internals --------------- */

    function _rarityToSlug(Rarity r) internal pure returns (string memory) {
        if (r == Rarity.Rare) return "rare";
        if (r == Rarity.Epic) return "epic";
        return "normal";
    }

    function _rarityToName(Rarity r) internal pure returns (string memory) {
        if (r == Rarity.Rare) return "Rare";
        if (r == Rarity.Epic) return "Epic";
        return "Normal";
    }
}



