// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ZetaQuestLight {
    event Visited(address indexed player, uint256 srcChainId, string note);

    address public owner;
    constructor(){ owner = msg.sender; }

    // En integración real, esto lo llama el endpoint/conector de Zeta en Amoy.
    function onReceive(bytes calldata payload) external {
        (address player, uint256 srcChainId) = abi.decode(payload, (address, uint256));
        emit Visited(player, srcChainId, "ping-from-athens");
    }
}
