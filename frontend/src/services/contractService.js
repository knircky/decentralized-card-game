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

  async rejoinPool() {
    console.log('ContractService: Rejoining pool...');
    const tx = await this.contract.rejoinPool();
    await tx.wait();
    console.log('ContractService: Rejoined pool successfully');
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
      
      // Player struct: addr, balance, inPool, lastActivity
      return {
        balance: ethers.utils.formatEther(player[1] || 0),
        inPool: player[2] || false,
        poolSize: poolSize.toNumber()
      };
    } catch (error) {
      console.error('Contract call error:', error);
      return { balance: "0", inPool: false, poolSize: 0 };
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
}