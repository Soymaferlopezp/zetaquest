// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Core del jugador: registra el NFT ya minteado, guarda mundo/buffs,
 * expone vistas para HUD y (opcionalmente) para tokenURI dinámico del NFT.
 * El envío/handler cross-chain real se enchufa en travelTo/onZetaMessage.
 */

interface IERC721EnumerableLite {
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}

contract ZetaQuestCore {
    struct Stats { uint32 atk; uint32 def; uint32 spd; }
    struct Player {
        uint256 tokenId;
        uint256 currentWorld; // chainId destino actual (ej: 80002 Amoy)
        Stats baseStats;
        Stats buff;
        bool registered;
    }

    event Registered(address indexed player, uint256 tokenId);
    event Traveled(address indexed player, uint256 tokenId, uint256 dstChainId, Stats buffApplied);
    event ZetaMessageHandled(address indexed player, uint256 tokenId, uint256 fromChainId, bytes note);

    address public owner;
    IERC721EnumerableLite public questNFT;

    // (Para whitelistear destinos)
    mapping(uint256 => bool) public allowedDstChains;

    // jugador -> datos
    mapping(address => Player) public players;
    // tokenId -> jugador (para vistas por token)
    mapping(uint256 => address) public tokenOwner;

    modifier onlyOwner(){ require(msg.sender == owner, "not owner"); _; }

    constructor(address _questNFT) {
        owner = msg.sender;
        questNFT = IERC721EnumerableLite(_questNFT);
    }

    function allowDstChain(uint256 chainId, bool allowed) external onlyOwner {
        allowedDstChains[chainId] = allowed;
    }

    /// Registro explícito tras mint del NFT (1 por wallet).
    function register() external returns (uint256 tokenId) {
        Player storage p = players[msg.sender];
        require(!p.registered, "already registered");
        require(questNFT.balanceOf(msg.sender) > 0, "mint NFT first");
        tokenId = questNFT.tokenOfOwnerByIndex(msg.sender, 0);

        p.registered = true;
        p.tokenId = tokenId;
        p.currentWorld = 0; // "home"
        p.baseStats = Stats(10, 8, 7);
        p.buff = Stats(0, 0, 0);
        tokenOwner[tokenId] = msg.sender;

        emit Registered(msg.sender, tokenId);
    }

    /// Registro perezoso si el jugador no llamó register() pero ya tiene NFT.
    function _lazyRegister(address player) internal {
        Player storage p = players[player];
        if (p.registered) return;
        if (questNFT.balanceOf(player) == 0) return;
        uint256 tokenId = questNFT.tokenOfOwnerByIndex(player, 0);
        p.registered = true;
        p.tokenId = tokenId;
        p.currentWorld = 0;
        p.baseStats = Stats(10, 8, 7);
        p.buff = Stats(0, 0, 0);
        tokenOwner[tokenId] = player;
        emit Registered(player, tokenId);
    }

    function getPlayerState(address addr) external view returns (uint256 world, Stats memory effective) {
        Player storage p = players[addr];
        if (!p.registered) {
            // Si no está registrado, mundo=0 y stats base por defecto
            Stats memory base = Stats(10,8,7);
            return (0, base);
        }
        world = p.currentWorld;
        effective = Stats(
            p.baseStats.atk + p.buff.atk,
            p.baseStats.def + p.buff.def,
            p.baseStats.spd + p.buff.spd
        );
    }

    /// Vista para tokenURI dinámico (opcional desde el NFT).
    function tokenWorldAndBuff(uint256 tokenId)
        external
        view
        returns (uint256 world, uint32 atk, uint32 def, uint32 spd)
    {
        address ownerAddr = tokenOwner[tokenId];
        if (ownerAddr == address(0)) {
            // Si no hay registro, intentar deducir el dueño real (caso borde)
            ownerAddr = questNFT.ownerOf(tokenId);
        }
        Player storage p = players[ownerAddr];
        if (!p.registered || p.tokenId != tokenId) {
            // No registrado aún → mundo=0, buff=0
            return (0, 0, 0, 0);
        }
        world = p.currentWorld;
        atk = p.buff.atk;
        def = p.buff.def;
        spd = p.buff.spd;
    }

    /// Envío cross-chain (stub): aquí va el zetaSend real con el SDK de ZetaChain.
    function travelTo(uint256 dstChainId, address /*dstContract*/, uint256 /*gasLimit*/) external payable {
        _lazyRegister(msg.sender);
        Player storage p = players[msg.sender];
        require(p.registered, "register first (mint NFT)");
        require(allowedDstChains[dstChainId], "dst not allowed");

        // TODO: reemplazar por zetaSend(payload,...). Demo: aplicar buff según chain y emitir evento.
        Stats memory applied = _buffFor(dstChainId);
        p.buff = applied;
        p.currentWorld = dstChainId;
        emit Traveled(msg.sender, p.tokenId, dstChainId, applied);
    }

    /// Handler del mensaje de vuelta (stub); el conector real llamará esto.
    function onZetaMessage(address player, uint256 tokenId, uint256 fromChainId, bytes calldata note) external {
        // TODO: require(msg.sender == <conector_zetachain>);
        Player storage p = players[player];
        require(p.registered && p.tokenId == tokenId, "invalid player/token");
        emit ZetaMessageHandled(player, tokenId, fromChainId, note);
    }

    function _buffFor(uint256 dstChainId) internal pure returns (Stats memory) {
        if (dstChainId == 80002) {     // Polygon Amoy
            return Stats(3, 0, 2);
        } else if (dstChainId == 97) { // BNB testnet
            return Stats(1, 3, 1);
        }
        return Stats(1, 1, 1);
    }
}
