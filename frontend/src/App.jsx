import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import WalletConnect from './components/WalletConnect';
import PlayerPool from './components/PlayerPool';
import GameTable from './components/GameTable';
import WithdrawModal from './components/WithdrawModal';
import { ContractService } from './services/contractService';
import { P2PService } from './services/p2p';
import './App.css';

function App() {
  console.log('App component is rendering');
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [p2pService, setP2PService] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    console.log('App useEffect triggered - provider:', !!provider, 'account:', account);
    
    if (provider && account) {
      console.log('Creating contract service and P2P service...');
      const contractService = new ContractService(provider, account);
      setContract(contractService);
      
      const p2p = new P2PService(account);
      setP2PService(p2p);
      
      // Listen for game events
      console.log('Setting up GameStarted event listener...');
      contractService.onGameStarted((gameId, player1, player2) => {
        console.log('🎮 GameStarted event received!');
        console.log('  Game ID:', gameId);
        console.log('  Player 1:', player1);
        console.log('  Player 2:', player2);
        console.log('  Current Account:', account);
        
        // Normalize addresses for comparison
        const normalizedAccount = account.toLowerCase();
        const normalizedPlayer1 = player1.toLowerCase();
        const normalizedPlayer2 = player2.toLowerCase();
        
        console.log('  Player 1 matches:', normalizedPlayer1 === normalizedAccount);
        console.log('  Player 2 matches:', normalizedPlayer2 === normalizedAccount);
        
        if (player1.toLowerCase() === account.toLowerCase() || player2.toLowerCase() === account.toLowerCase()) {
          console.log('🎯 This player is in the game! Setting up game...');
          
          // Use original addresses
          const opponent = player1.toLowerCase() === account.toLowerCase() ? player2 : player1;
          const isPlayer1 = player1.toLowerCase() === account.toLowerCase();
          
          console.log('  Opponent:', opponent);
          console.log('  Is Player 1:', isPlayer1);
          
          const gameData = { gameId, opponent, isPlayer1 };
          console.log('  Setting current game:', gameData);
          setCurrentGame(gameData);
          
          console.log('  Connecting to P2P...');
          p2p.connectToGame(gameId, opponent);
        } else {
          console.log('❌ This player is not in the game');
        }
      });
      
      console.log('Loading initial player data...');
      loadPlayerData(contractService);
    }
  }, [provider, account]);

  const loadPlayerData = async (contractService) => {
    console.log('Loading player data...');
    const data = await contractService.getPlayerData();
    console.log('Player data loaded:', data);
    setPlayerData(data);
  };

  const handleGameEnd = async (result) => {
    console.log('Game ended:', result);
    
    // Clear current game
    setCurrentGame(null);
    
    // Rejoin pool if player wants to play again
    if (result.playAgain && contract) {
      try {
        console.log('Player wants to play again, rejoining pool...');
        await contract.rejoinPool();
        console.log('Successfully rejoined pool');
      } catch (error) {
        console.error('Error rejoining pool:', error);
      }
    }
    
    // Always reload player data
    await loadPlayerData(contract);
  };

  console.log('App render state:');
  console.log('  Account:', account);
  console.log('  Current game:', currentGame);
  console.log('  Player data:', playerData);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Decentralized Card Game</h1>
          <WalletConnect 
            onConnect={(provider, account) => {
              console.log('Wallet connected:', account);
              setProvider(provider);
              setAccount(account);
            }}
          />
        </div>
      </header>

      <main className="container mx-auto p-4">
        {!account ? (
          <div className="text-center py-20">
            <h2 className="text-3xl mb-4">Connect your wallet to play!</h2>
          </div>
        ) : currentGame ? (
          <div>
            <div className="bg-green-600 p-4 rounded mb-4">
              <h3 className="text-lg font-bold">🎮 GAME ACTIVE!</h3>
              <p>Game ID: {currentGame.gameId}</p>
              <p>Opponent: {currentGame.opponent}</p>
              <p>You are Player: {currentGame.isPlayer1 ? '1' : '2'}</p>
            </div>
            <GameTable 
              game={currentGame}
              account={account}
              p2pService={p2pService}
              onGameEnd={handleGameEnd}
            />
          </div>
        ) : (
          <>
            <PlayerPool 
              contract={contract}
              playerData={playerData}
              onDataUpdate={() => loadPlayerData(contract)}
            />
            
            <button
              onClick={() => setShowWithdraw(true)}
              className="mt-4 bg-red-600 hover:bg-red-700 px-6 py-2 rounded"
            >
              Withdraw Funds
            </button>
          </>
        )}
      </main>

      {showWithdraw && (
        <WithdrawModal
          contract={contract}
          onClose={() => setShowWithdraw(false)}
          onWithdraw={() => {
            setShowWithdraw(false);
            loadPlayerData(contract);
          }}
        />
      )}
    </div>
  );
}

export default App;