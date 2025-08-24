// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ZetaQuestScore is Ownable {
    mapping(address => uint256) public xpOf;

    event XpAdded(address indexed player, uint256 amount, uint256 newTotal);

    constructor(address owner_) Ownable(owner_) {}

    function addXp(address player, uint256 amount) external onlyOwner {
        xpOf[player] += amount;
        emit XpAdded(player, amount, xpOf[player]);
    }
}
