// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract CardGame is ReentrancyGuard {
    using ECDSA for bytes32;
    
    uint256 public constant BET_AMOUNT = 10 ether; // 10 tokens per bet
    uint256 public constant MIN_STAKE = 100 ether; // Minimum stake to join pool
    uint256 public gameIdCounter;
    
    struct Player {
        address addr;
        uint256 balance;
        bool staked;
        bool availableForMatching;
        uint256 lastActivity;
    }
    
    struct GameResult {
        address player1;
        address player2;
        address winner; // address(0) for tie
        uint256 gameId;
        uint256 timestamp;
        bytes signature1;
        bytes signature2;
    }
    
    mapping(address => Player) public players;
    address[] public playerPool;
    mapping(uint256 => bool) public processedGames;
    
    event PlayerJoined(address indexed player, uint256 balance);
    event PlayerLeft(address indexed player, uint256 balance);
    event PlayerEnteredMatchmaking(address indexed player);
    event GameStarted(uint256 indexed gameId, address player1, address player2);
    event Withdrawal(address indexed player, uint256 amount);
    
    modifier onlyActivePlayer() {
        require(players[msg.sender].balance > 0, "No balance");
        _;
    }
    
    function joinPool() external payable {
        // Allow rejoining if player has sufficient balance
        if (players[msg.sender].staked) {
            require(msg.value == 0, "Already staked");
            return;
        }
        
        // Check if player exists and has sufficient balance
        if (players[msg.sender].balance >= BET_AMOUNT) {
            require(msg.value == 0, "No additional stake needed");
        } else {
            require(
                players[msg.sender].balance + msg.value >= MIN_STAKE, 
                "Insufficient stake"
            );
            
            if (players[msg.sender].balance == 0) {
                players[msg.sender] = Player({
                    addr: msg.sender,
                    balance: msg.value,
                    staked: true,
                    availableForMatching: true,
                    lastActivity: block.timestamp
                });
            } else {
                players[msg.sender].balance += msg.value;
            }
        }
        
        players[msg.sender].staked = true;
        players[msg.sender].availableForMatching = true;
        playerPool.push(msg.sender);
        emit PlayerJoined(msg.sender, players[msg.sender].balance);
        
        // Auto-match if possible
        if (playerPool.length >= 2) {
            _matchPlayers();
        }
    }
    
    function _matchPlayers() private {
        if (playerPool.length < 2) return;
        
        // Simple random matching
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao)));
        uint256 idx1 = random % playerPool.length;
        uint256 idx2 = (random >> 8) % (playerPool.length - 1);
        if (idx2 >= idx1) idx2++;
        
        address player1 = playerPool[idx1];
        address player2 = playerPool[idx2];

        players[player1].availableForMatching = false;
        players[player2].availableForMatching = false;
        
        // Remove from pool
        _removeFromPool(idx1);
        if (idx2 > idx1) idx2--;
        _removeFromPool(idx2);
        
        uint256 gameId = ++gameIdCounter;
        emit GameStarted(gameId, player1, player2);
    }
    
    function _removeFromPool(uint256 index) private {
        require(index < playerPool.length, "Invalid index");
        playerPool[index] = playerPool[playerPool.length - 1];
        playerPool.pop();
    }
    
    function withdrawWithHistory(GameResult[] calldata results) external nonReentrant onlyActivePlayer {
        uint256 netChange = 0;
        address player = msg.sender;
        
        // Remove from pool if in it
        if (players[player].availableForMatching) {
            for (uint256 i = 0; i < playerPool.length; i++) {
                if (playerPool[i] == player) {
                    _removeFromPool(i);
                    break;
                }
            }
        }
        players[player].staked = false;
        players[player].availableForMatching = false;
        
        // Process game results
        for (uint256 i = 0; i < results.length; i++) {
            GameResult calldata result = results[i];
            
            require(result.player1 == player || result.player2 == player, "Not participant");
            require(!processedGames[result.gameId], "Game already processed");
            
            processedGames[result.gameId] = true;
            
            if (result.winner == player) {
                netChange += BET_AMOUNT;
            } else if (result.winner != address(0)) {
                netChange -= BET_AMOUNT;
            }
        }
        
        // Calculate final balance
        uint256 currentBalance = players[player].balance;
        uint256 finalBalance;
        
        if (netChange >= 0) {
            finalBalance = currentBalance + uint256(netChange);
        } else {
            uint256 loss = uint256(-int256(netChange));
            require(currentBalance >= loss, "Insufficient balance for losses");
            finalBalance = currentBalance - loss;
        }
        
        players[player].balance = 0;
        players[player].lastActivity = block.timestamp;
        
        (bool success, ) = player.call{value: finalBalance}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(player, finalBalance);
    }
    
    function leavePool() external onlyActivePlayer {
        require(players[msg.sender].staked, "Not staked");
        
        players[msg.sender].staked = false;
        players[msg.sender].availableForMatching = false;
        
        for (uint256 i = 0; i < playerPool.length; i++) {
            if (playerPool[i] == msg.sender) {
                _removeFromPool(i);
                break;
            }
        }
        
        uint256 balanceToWithdraw = players[msg.sender].balance;
        players[msg.sender].balance = 0;
        
        (bool success, ) = msg.sender.call{value: balanceToWithdraw}("");
        require(success, "Transfer failed");
        
        emit PlayerLeft(msg.sender, balanceToWithdraw);
    }
    
    function getPoolSize() external view returns (uint256) {
        return playerPool.length;
    }
    
    function getPlayerPool() external view returns (address[] memory) {
        return playerPool;
    }
}