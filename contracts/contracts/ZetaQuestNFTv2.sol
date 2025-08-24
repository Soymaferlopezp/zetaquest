// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

interface IZetaQuestCore {
    // getPlayerState(addr) -> (uint256 worldId, uint256[3] stats) // [power, defense, xp]
    function getPlayerState(address) external view returns (uint256, uint256[3] memory);
}

contract ZetaQuestNFTv2 is ERC721Enumerable, Ownable {
    using Strings for uint256;

    enum Rarity { Normal, Rare, Epic }
    mapping(uint256 => Rarity) private _rarityOf;
    uint256 private _nextId = 1;

    string public baseImageURI; // e.g. ipfs://.../traveler-
    address public core;        // ZetaQuestCore (Athens)

    constructor(string memory _baseImageURI)
        ERC721("ZetaQuest Traveler", "ZQT")
        Ownable(msg.sender)
    {
        baseImageURI = _baseImageURI;
    }

    function setBaseImageURI(string calldata uri) external onlyOwner { baseImageURI = uri; }
    function setCore(address _core) external onlyOwner { core = _core; }

    function mint() external {
        require(balanceOf(msg.sender) == 0, "One per address");
        uint256 id = _nextId++;

        uint256 rand = uint256(keccak256(abi.encodePacked(block.prevrandao, msg.sender, id, block.timestamp)));
        uint256 roll = rand % 100;
        Rarity r = Rarity.Normal;
        if (roll < 2) r = Rarity.Epic;        // 2%
        else if (roll < 20) r = Rarity.Rare;  // 18%
        _rarityOf[id] = r;

        _safeMint(msg.sender, id);
    }

    function getRarity(uint256 tokenId) external view returns (Rarity) {
        _requireOwned(tokenId);
        return _rarityOf[tokenId];
    }

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

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        // Imagen por rareza (estática)
        string memory rarityStr = _rarityToSlug(_rarityOf[tokenId]);
        string memory image = string(abi.encodePacked(baseImageURI, rarityStr, ".png"));

        // Atributos base (si Core falla, al menos mostramos rarity)
        string memory attrs = string(
            abi.encodePacked('{"trait_type":"rarity","value":"', _rarityToName(_rarityOf[tokenId]), '"}')
        );

        // Enriquecer con Core si está seteado
        if (core != address(0)) {
            address owner = ownerOf(tokenId);
            try IZetaQuestCore(core).getPlayerState(owner) returns (uint256 worldId, uint256[3] memory stats) {
                // stats: [power, defense, xp]
                uint256 power = stats[0];
                uint256 defense = stats[1];
                uint256 xp = stats[2];

                // buffs aproximados versus base 10/10 (ajusta si tu base es otra)
                int256 buffP = int256(power) - 10;
                int256 buffD = int256(defense) - 10;

                attrs = string(
                    abi.encodePacked(
                        attrs,
                        ',{"trait_type":"world","value":"', Strings.toString(worldId), '"}',
                        ',{"trait_type":"buff_power","value":"', _itoa(buffP), '"}',
                        ',{"trait_type":"buff_defense","value":"', _itoa(buffD), '"}',
                        ',{"trait_type":"xp","value":"', Strings.toString(xp), '"}'
                    )
                );
            } catch {
                // silencioso: mantenemos solo rarity
            }
        }

        bytes memory json = abi.encodePacked(
            '{"name":"ZetaQuest Traveler #', tokenId.toString(),
            '","description":"RPG-lite cross-chain on ZetaChain.",',
            '"image":"', image, '",',
            '"attributes":[', attrs, "]",
            "}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    // entero con signo a string (+/-)
    function _itoa(int256 v) internal pure returns (string memory) {
        if (v >= 0) return string(abi.encodePacked("+", Strings.toString(uint256(v))));
        uint256 av = uint256(-v);
        return string(abi.encodePacked("-", Strings.toString(av)));
    }
}

