// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICoreReadable {
    // Debe coincidir con la firma que usa tu NFT v2
    function getPlayerState(address player)
        external
        view
        returns (uint256 world, uint256 power, uint256 defense, uint256 xp);
}

interface IZetaQuestCoreLike {
    function getPlayerState(address player)
        external
        view
        returns (uint256 world, uint256 power, uint256 defense, uint256 xp);
}

interface IZetaQuestScoreLike {
    function xpOf(address player) external view returns (uint256);
}

contract ZetaQuestCoreAdapter is ICoreReadable {
    IZetaQuestCoreLike public immutable core;
    IZetaQuestScoreLike public immutable score;

    constructor(address core_, address score_) {
        core = IZetaQuestCoreLike(core_);
        score = IZetaQuestScoreLike(score_);
    }

    function getPlayerState(address player)
        external
        view
        override
        returns (uint256 world, uint256 power, uint256 defense, uint256 xp)
    {
        (world, power, defense, xp) = core.getPlayerState(player);
        uint256 extra = score.xpOf(player);
        unchecked { xp += extra; }
    }
}
