import { ethers } from 'ethers';
import CardGameABI from '../abi/CardGame.json';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export class ContractService {
  constructor(provider, account) {
    this.provider = provider;
    this.account = account;
    this.signer = provider.getSigner();
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CardGameABI, this.signer);
    console.log('ContractService created for account:', account);
    console.log('Contract address:', CONTRACT_ADDRESS);
  }

  async joinPool(amount) {
    console.log('ContractService: Attempting to join pool with amount:', amount);
    const tx = await this.contract.joinPool({
      value: ethers.utils.parseEther(amount.toString())
    });
    console.log('ContractService: Transaction sent:', tx.hash);
    await tx.wait();
    console.log('ContractService: Transaction confirmed');
  }

  async leavePool() {
    console.log('ContractService: Leaving pool...');
    const tx = await this.contract.leavePool();
    await tx.wait();
    console.log('ContractService: Left pool successfully');
  }

  async enterMatchmaking() {
    console.log('ContractService: Entering matchmaking...');
    try {
      const tx = await this.contract.enterMatchmaking();
      console.log('ContractService: Transaction sent for enterMatchmaking:', tx.hash);
      await tx.wait();
      console.log('ContractService: Entered matchmaking successfully');
    } catch (error) {
      console.error('ContractService: Error entering matchmaking:', error);
      throw error; // Re-throw to be caught by UI
    }
  }

  async withdrawWithHistory(gameResults) {
    console.log('ContractService: Withdrawing with history:', gameResults);
    
    // Format game results for contract
    const formattedResults = gameResults.map(game => ({
      player1: game.player1,
      player2: game.player2,
      winner: game.winner || ethers.constants.AddressZero,
      gameId: game.gameId,
      timestamp: game.timestamp,
      signature1: game.signature1 || `0x${'00'.repeat(65)}`,
      signature2: game.signature2 || `0x${'00'.repeat(65)}`
    }));
    
    const tx = await this.contract.withdrawWithHistory(formattedResults);
    await tx.wait();
    console.log('ContractService: Withdrawal successful');
  }

  async getPlayerData() {
    try {
      console.log('Getting player data for:', this.account);
      
      const player = await this.contract.players(this.account);
      console.log('Raw player data:', player);
      
      const poolSize = await this.contract.getPoolSize();
      console.log('Pool size:', poolSize);
      
      // Player struct: address addr, uint256 balance, bool staked, bool availableForMatching, uint256 lastActivity
      // Solidity returns an array: [addr, balance, staked, availableForMatching, lastActivity]
      // However, ethers.js might also return an object-like array with named properties. Let's access by index for safety.
      return {
        balance: ethers.utils.formatEther(player[1] || 0), // balance is at index 1
        staked: player[2] || false, // staked is at index 2
        availableForMatching: player[3] || false, // availableForMatching is at index 3
        poolSize: poolSize.toNumber()
      };
    } catch (error) {
      console.error('Contract call error:', error);
      return { balance: "0", staked: false, availableForMatching: false, poolSize: 0 };
    }
  }
  
  async getPlayerPool() {
    console.log('Getting player pool...');
    const pool = await this.contract.getPlayerPool();
    console.log('Player pool:', pool);
    return pool;
  }

  onGameStarted(callback) {
    console.log('Setting up GameStarted event listener...');
    
    // Remove any existing listeners first
    this.contract.removeAllListeners('GameStarted');
    
    this.contract.on('GameStarted', (gameId, player1, player2, event) => {
      console.log('🔥 GameStarted event fired!');
      console.log('  Game ID:', gameId);
      console.log('  Player 1:', player1);
      console.log('  Player 2:', player2);
      
      try {
        callback(gameId.toNumber(), player1, player2);
      } catch (error) {
        console.error('Error in GameStarted callback:', error);
      }
    });
    
    console.log('GameStarted event listener registered');
  }

  onPlayerEnteredMatchmaking(callback) {
    console.log('Setting up PlayerEnteredMatchmaking event listener...');
    this.contract.removeAllListeners('PlayerEnteredMatchmaking'); // Remove existing listeners
    this.contract.on('PlayerEnteredMatchmaking', (playerAddress, event) => {
      console.log('👋 PlayerEnteredMatchmaking event fired!');
      console.log('  Player Address:', playerAddress);
      if (this.account.toLowerCase() === playerAddress.toLowerCase()) {
        try {
          callback(playerAddress);
        } catch (error) {
          console.error('Error in PlayerEnteredMatchmaking callback:', error);
        }
      }
    });
    console.log('PlayerEnteredMatchmaking event listener registered');
  }
}