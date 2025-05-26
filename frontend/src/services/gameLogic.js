import { ethers } from 'ethers';

export const gameLogic = {
  generateCardAndCommit() {
    // Generate random card (0-51)
    const card = Math.floor(Math.random() * 52);
    
    // Generate random secret
    const secret = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    
    // Create commit hash
    const commit = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes32'],
        [card, secret]
      )
    );
    
    return { card, secret, commit };
  },

  verifyCommit(card, secret, commit) {
    const calculatedCommit = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes32'],
        [card, secret]
      )
    );
    
    return calculatedCommit === commit;
  },

  determineWinner(card1, card2, player1, player2) {
    // Compare card values (considering Ace as highest)
    const value1 = (card1 % 13 === 0) ? 13 : card1 % 13;
    const value2 = (card2 % 13 === 0) ? 13 : card2 % 13;
    
    if (value1 > value2) return player1;
    if (value2 > value1) return player2;
    return null; // Tie
  },

  // Original method with MetaMask popup (for blockchain submission)
  async createAndSignResult(gameId, player1, player2, winner, isPlayer1) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const messageHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'address', 'uint256', 'uint256'],
        [player1, player2, winner || ethers.constants.AddressZero, gameId, timestamp]
      )
    );
    
    // Sign with MetaMask (shows popup)
    const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
    
    return {
      player1,
      player2,
      winner: winner || ethers.constants.AddressZero,
      gameId,
      timestamp,
      messageHash,
      signature1: isPlayer1 ? signature : null,
      signature2: isPlayer1 ? null : signature
    };
  },

  // NEW: Silent signing method (no MetaMask popup)
  async createAndSignResultSilent(gameId, player1, player2, winner, isPlayer1) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // For local development, skip actual signing
    const mockSignature = `0x${'00'.repeat(65)}${gameId}${isPlayer1 ? '01' : '02'}`;
    
    console.log('GameLogic: Creating mock signature for local play');
    
    return {
      player1,
      player2,
      winner: winner || ethers.constants.AddressZero,
      gameId,
      timestamp,
      message: `Local game result: ${gameId}`,
      signature1: isPlayer1 ? mockSignature : null,
      signature2: isPlayer1 ? null : mockSignature,
      localOnly: true
    };
  }
};