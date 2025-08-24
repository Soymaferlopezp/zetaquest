// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ScoreV2
 * @dev Sencillo: guarda XP por jugador y emite evento con el título de la quest.
 */
contract ScoreV2 is Ownable {
    mapping(address => uint256) public xpOf;

    event XpAdded(address indexed player, uint256 amount, uint256 newTotal);
    event QuestCompleted(address indexed player, string title, uint256 amount);

    constructor(address _owner) Ownable(_owner) {}

    function addXpAndLog(address player, uint256 amount, string calldata title) external onlyOwner {
        xpOf[player] += amount;
        emit XpAdded(player, amount, xpOf[player]);
        emit QuestCompleted(player, title, amount);
    }

    // helper de lectura (opcional)
    function getXp(address player) external view returns (uint256) {
        return xpOf[player];
    }
}
