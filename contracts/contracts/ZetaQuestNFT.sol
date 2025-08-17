// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract ZetaQuestNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;

    enum Rarity { Normal, Rare, Epic }
    mapping(uint256 => Rarity) private _rarityOf;
    uint256 private _nextId = 1;

    string public baseImageURI; // e.g. http://localhost:3000/art/traveler-

    constructor(string memory _baseImageURI)
        ERC721("ZetaQuest Traveler", "ZQT")
        Ownable(msg.sender)
    {
        baseImageURI = _baseImageURI;
    }

    function setBaseImageURI(string calldata uri) external onlyOwner {
        baseImageURI = uri;
    }

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

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId); 
        string memory rarityStr = _rarityToSlug(_rarityOf[tokenId]); // normal|rare|epic
        string memory image = string(abi.encodePacked(baseImageURI, rarityStr, ".png"));

        bytes memory json = abi.encodePacked(
            '{"name":"ZetaQuest Traveler #', tokenId.toString(),
            '","description":"RPG-lite cross-chain on ZetaChain.",',
            '"image":"', image, '",',
            '"attributes":[{"trait_type":"rarity","value":"', _rarityToName(_rarityOf[tokenId]), '"}]',
            "}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
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
}

