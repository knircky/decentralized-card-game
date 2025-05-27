import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import WalletConnect from './components/WalletConnect';
import PlayerPool from './components/PlayerPool';
import GameTable from './components/GameTable';
import WithdrawModal from './components/WithdrawModal';
import { ContractService } from './services/contractService';
import { P2PService } from './services/p2p';
import './App.css';

// Constants for UI Views
const UI_VIEWS = {
  CONNECT_WALLET: 'CONNECT_WALLET',
  PLAYER_POOL: 'PLAYER_POOL',
  GAME_TABLE: 'GAME_TABLE',
  LOADING_TRANSACTION: 'LOADING_TRANSACTION',
  WAITING_FOR_MATCH: 'WAITING_FOR_MATCH', // Could be a state within PLAYER_POOL
  ERROR: 'ERROR',
};

function App() {
  console.log('App component is rendering');
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contractService, setContractService] = useState(null);
  const [p2pService, setP2PService] = useState(null);
  
  const [playerData, setPlayerData] = useState({
    balance: "0",
    staked: false,
    availableForMatching: false,
    poolSize: 0,
  });
  const [currentGameDetails, setCurrentGameDetails] = useState(null); // { gameId, opponent, isPlayer1 }
  const [gameHistory, setGameHistory] = useState([]); // Array of game results
  const [uiView, setUiView] = useState(UI_VIEWS.CONNECT_WALLET);
  const [isLoading, setIsLoading] = useState(true); // For initial load and major transitions
  const [activeTxHash, setActiveTxHash] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Removed showWithdraw as it will be part of gameHistory flow

  // Effect for Wallet Connection and Initial Setup
  useEffect(() => {
    console.log('App Initial Setup Effect - Account:', account);
    let currentContractServiceInstance = null;
    let currentP2PServiceInstance = null;

    if (account && provider) {
      setUiView(UI_VIEWS.LOADING_TRANSACTION); // Initial loading state
      console.log('Account and Provider detected. Initializing services...');
      currentContractServiceInstance = new ContractService(provider, account);
      setContractService(currentContractServiceInstance);

      currentP2PServiceInstance = new P2PService(account);
      setP2PService(currentP2PServiceInstance);
      
      // Load initial data
      fetchInitialData(currentContractServiceInstance);

      // Setup contract event listeners
      console.log('Setting up contract event listeners...');
      currentContractServiceInstance.onGameStarted(handleGameStartedEvent);
      currentContractServiceInstance.onPlayerEnteredMatchmaking(handlePlayerEnteredMatchmakingEvent);
      // TODO: Add listeners for PlayerJoined, PlayerLeft if they should trigger UI updates directly
      // For now, most updates rely on direct function calls triggering fetchPlayerData

    } else {
      setUiView(UI_VIEWS.CONNECT_WALLET);
      setIsLoading(false);
    }
    
    // Cleanup listeners on component unmount or if account changes
    return () => {
      console.log('Cleaning up App Initial Setup Effect...');
      if (currentContractServiceInstance) {
        console.log('Removing listeners from contractService instance');
        currentContractServiceInstance.contract.removeAllListeners(); 
      }
      if (currentP2PServiceInstance) {
        console.log('Removing listeners from p2pService instance');
        currentP2PServiceInstance.removeAllListeners(); 
      }
    };
  }, [account, provider]); // Re-run if account or provider changes

  const fetchInitialData = async (serviceInstanceToUse) => { // Renamed param for clarity
  const fetchInitialData = async (serviceInstanceToUse) => { // Renamed param for clarity
    console.log('Fetching initial data...');
    setIsLoading(true);
    try {
      await fetchPlayerData(serviceInstanceToUse); // Fetches player data using the passed instance
      
      // Load game history from localStorage
      const storedGameHistory = localStorage.getItem('gameHistory');
      if (storedGameHistory) {
        setGameHistory(JSON.parse(storedGameHistory));
      } else {
        setGameHistory([]);
      }
      // Determine initial view based on player data
      // This will be refined after playerData is fetched
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setErrorMessage("Failed to load initial data. Please refresh.");
      setUiView(UI_VIEWS.ERROR);
    } finally {
      setIsLoading(false);
      // Initial view decision will be handled in fetchPlayerData or a subsequent effect
    }
  };
  
  const fetchPlayerData = async (serviceToUse) => {
    const service = serviceToUse || contractService;
    if (!service) {
      console.log("fetchPlayerData: Contract service not available.");
      setUiView(UI_VIEWS.CONNECT_WALLET); // Or an error state
      return;
    }
    console.log('Fetching player data...');
    setIsLoading(true); // Good for general loading states
    try {
      const data = await service.getPlayerData();
      console.log('Player data received:', data);
      setPlayerData(data);

      // Basic view logic based on player data
      if (currentGameDetails) {
        setUiView(UI_VIEWS.GAME_TABLE);
      } else if (data.staked && data.availableForMatching) {
        setUiView(UI_VIEWS.WAITING_FOR_MATCH); // Or PLAYER_POOL if it handles this state
      } else {
        setUiView(UI_VIEWS.PLAYER_POOL);
      }
    } catch (error) {
      console.error('Error loading player data:', error);
      setErrorMessage('Failed to load player data.');
      setUiView(UI_VIEWS.ERROR); // Or PLAYER_POOL with an error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameStartedEvent = (gameId, player1, player2) => {
    console.log('EVENT: GameStarted received!', { gameId: gameId.toString(), player1, player2, currentAccount: account });
    const normalizedAccount = account.toLowerCase();
    const normalizedPlayer1 = player1.toLowerCase();
    const normalizedPlayer2 = player2.toLowerCase();

    if (normalizedPlayer1 === normalizedAccount || normalizedPlayer2 === normalizedAccount) {
      console.log('This player is in the game! Setting up game...');
      const opponent = normalizedPlayer1 === normalizedAccount ? player2 : player1;
      const isPlayer1 = normalizedPlayer1 === normalizedAccount;
      
      setCurrentGameDetails({ gameId: gameId.toNumber(), opponent, isPlayer1 });
      setUiView(UI_VIEWS.GAME_TABLE);
      fetchPlayerData(); // Update player data as availableForMatching should be false
      
      if (p2pService) {
        console.log('Connecting to P2P for game:', gameId.toNumber(), 'with opponent:', opponent);
        // Assuming p2pService.connectToGame needs to be called or is auto-managed
        // p2pService.connectToGame(gameId.toNumber(), opponent); 
      }
    } else {
      console.log('GameStarted event not for this player.');
    }
  };
  
  const handleJoinPool = async (stakeAmount) => {
    if (!contractService) return;
    console.log('Attempting to join pool with amount:', stakeAmount);
    setUiView(UI_VIEWS.LOADING_TRANSACTION);
    setIsLoading(true);
    setErrorMessage('');
    try {
      const tx = await contractService.joinPool(stakeAmount); // Assuming joinPool in service handles parseEther
      setActiveTxHash(tx.hash);
      await tx.wait(); // Wait for transaction confirmation
      setActiveTxHash(null);
      await fetchPlayerData(); // This will also update uiView based on new state
      // uiView will be set by fetchPlayerData
    } catch (error) {
      console.error('Error joining pool:', error);
      setErrorMessage(error?.data?.message || error.message || 'Failed to join pool.');
      setUiView(UI_VIEWS.PLAYER_POOL); // Revert to pool view on error
      setActiveTxHash(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterMatchmaking = async () => {
    if (!contractService) return;
    console.log('Entering matchmaking...');
    setUiView(UI_VIEWS.LOADING_TRANSACTION);
    setIsLoading(true);
    setErrorMessage('');
    try {
      const tx = await contractService.enterMatchmaking();
      setActiveTxHash(tx.hash);
      await tx.wait();
      setActiveTxHash(null);
      await fetchPlayerData(); // This will set playerData and then uiView (likely to WAITING_FOR_MATCH)
    } catch (error) {
      console.error('Error entering matchmaking:', error);
      setErrorMessage(error?.data?.message || error.message || 'Failed to enter matchmaking.');
      setUiView(UI_VIEWS.PLAYER_POOL); // Revert to pool view
      setActiveTxHash(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawAndQuit = async () => {
    if (!contractService) return;
    console.log('Withdrawing funds and quitting...');
    
    const unprocessedResults = gameHistory.filter(game => !game.processedOnChain)
      .map(game => ({ // Format for the contract
        player1: game.player1,
        player2: game.player2,
        winner: game.winner || ethers.constants.AddressZero, // Ensure winner is address(0) for tie
        gameId: game.gameId,
        // Assuming contract doesn't need timestamp and signatures for this simplified flow yet
        // If it does, these need to be mocked or retrieved if stored
        timestamp: Math.floor(game.timestamp / 1000), // Or however your contract expects it
        signature1: `0x${'00'.repeat(65)}`, // Placeholder
        signature2: `0x${'00'.repeat(65)}`, // Placeholder
      }));

    if (unprocessedResults.length === 0) {
      console.log('No unprocessed games to withdraw. Checking if player is staked to leave pool.');
      if (playerData.staked) { // Player might just want to leave pool without any games played or all processed
         try {
            setUiView(UI_VIEWS.LOADING_TRANSACTION);
            setIsLoading(true);
            setErrorMessage('');
            const tx = await contractService.leavePool(); // Use leavePool if no results to process
            setActiveTxHash(tx.hash);
            await tx.wait();
            setActiveTxHash(null);
            await fetchPlayerData(); // Will update staked status and view
         } catch (error) {
            console.error('Error leaving pool:', error);
            setErrorMessage(error?.data?.message || error.message || 'Failed to leave pool.');
            setUiView(UI_VIEWS.PLAYER_POOL);
            setActiveTxHash(null);
         } finally {
            setIsLoading(false);
         }
      } else {
        setUiView(UI_VIEWS.PLAYER_POOL); // Already not staked, just go to pool view
      }
      return;
    }

    setUiView(UI_VIEWS.LOADING_TRANSACTION);
    setIsLoading(true);
    setErrorMessage('');
    try {
      const tx = await contractService.withdrawWithHistory(unprocessedResults);
      setActiveTxHash(tx.hash);
      await tx.wait();
      setActiveTxHash(null);

      // Mark games as processed
      const updatedHistory = gameHistory.map(game => {
        if (unprocessedResults.find(ur => ur.gameId.toString() === game.gameId.toString())) {
          return { ...game, processedOnChain: true };
        }
        return game;
      });
      setGameHistory(updatedHistory);
      localStorage.setItem('gameHistory', JSON.stringify(updatedHistory));

      await fetchPlayerData(); // This will update staked status and uiView
    } catch (error) {
      console.error('Error withdrawing with history:', error);
      setErrorMessage(error?.data?.message || error.message || 'Failed to withdraw funds.');
      setUiView(UI_VIEWS.PLAYER_POOL); // Revert to pool view
      setActiveTxHash(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerEnteredMatchmakingEvent = (playerAddress) => {
    console.log('EVENT: PlayerEnteredMatchmaking received for address:', playerAddress);
    if (account && playerAddress.toLowerCase() === account.toLowerCase()) {
      console.log('Current player entered matchmaking. Fetching player data.');
      fetchPlayerData(); 
      // uiView should naturally update via fetchPlayerData's logic
      // if not already in game_table or loading_transaction
      if (uiView !== UI_VIEWS.GAME_TABLE && uiView !== UI_VIEWS.LOADING_TRANSACTION) {
         // setUiView(UI_VIEWS.WAITING_FOR_MATCH); // Let fetchPlayerData handle view based on new data
      }
    }
  };
  
  const handleGameEnd = async (gameResultFromTable) => { 
    console.log('Game ended in App.jsx:', gameResultFromTable);
    
    const newHistoryEntry = {
      gameId: gameResultFromTable.gameId,
      player1: gameResultFromTable.isPlayer1 ? account : gameResultFromTable.opponentAddress,
      player2: gameResultFromTable.isPlayer1 ? gameResultFromTable.opponentAddress : account,
      winner: gameResultFromTable.winner, 
      myCard: gameResultFromTable.myCard, 
      opponentCard: gameResultFromTable.opponentCard, 
      timestamp: Date.now(), 
      processedOnChain: false, 
    };

    const updatedGameHistory = [...gameHistory, newHistoryEntry];
    setGameHistory(updatedGameHistory);
    localStorage.setItem('gameHistory', JSON.stringify(updatedGameHistory));
    
    setCurrentGameDetails(null); // Clear current game details *after* processing history

    await fetchPlayerData(); // Refresh player data

    if (gameResultFromTable.playAgain) {
      console.log('Player wants to play again.');
      await handleEnterMatchmaking(); // Make sure this is awaited if it's async
    } else if (gameResultFromTable.quit) {
      console.log('Player wants to quit.');
      const unprocessedGames = updatedGameHistory.filter(g => !g.processedOnChain);
      if (unprocessedGames.length > 0) {
        await handleWithdrawAndQuit(); // Make sure this is awaited
      } else {
        setUiView(UI_VIEWS.PLAYER_POOL);
      }
    } else {
      // Default to player pool if no specific action (e.g. opponent quit, or error in game table)
      setUiView(UI_VIEWS.PLAYER_POOL);
    }
  };

  console.log('App render state:');
  console.log('  Account:', account);
  console.log('  Current game details:', currentGameDetails);
  console.log('  Player data:', playerData);
  console.log('  UI View:', uiView);
  console.log('  IsLoading:', isLoading);

  // Centralized loading/transaction view
  if (uiView === UI_VIEWS.LOADING_TRANSACTION || (isLoading && !errorMessage)) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Processing...</h1>
        {activeTxHash && (
          <p className="mb-2">Transaction: 
            <a 
              href={`https://sepolia.etherscan.io/tx/${activeTxHash}`} // Assuming Sepolia for dev
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:text-blue-600 ml-1"
            >
              {activeTxHash.slice(0,10)}...{activeTxHash.slice(-8)}
            </a>
          </p>
        )}
        <p className="text-lg">{errorMessage || 'Please wait for the transaction to confirm.'}</p>
        {/* Optional: Add a spinner icon */}
      </div>
    );
  }

  let currentViewContent = null;
  switch (uiView) {
    case UI_VIEWS.CONNECT_WALLET:
      currentViewContent = (
        <div className="text-center py-20">
          <h2 className="text-3xl mb-4">Connect your wallet to play!</h2>
          <p>Please use the button in the header to connect.</p>
        </div>
      );
      break;
    case UI_VIEWS.PLAYER_POOL:
    case UI_VIEWS.WAITING_FOR_MATCH: // PlayerPool component handles its internal state for this
      if (account && contractService) {
        currentViewContent = (
          <PlayerPool 
            contractService={contractService} 
            playerData={playerData}
            onDataUpdate={() => fetchPlayerData(contractService)}
            onJoinPool={handleJoinPool}
            onEnterMatchmaking={handleEnterMatchmaking}
            onWithdrawAndQuit={handleWithdrawAndQuit}
          />
        );
      } else {
        // Fallback if services not ready, though should be handled by LOADING or CONNECT_WALLET
        currentViewContent = <p>Loading player area...</p>; 
      }
      break;
    case UI_VIEWS.GAME_TABLE:
      if (currentGameDetails && account && p2pService) {
        currentViewContent = (
          <div>
            <div className="bg-green-700 p-4 rounded mb-4 shadow-lg">
              <h3 className="text-xl font-bold text-center">🎮 GAME ACTIVE! 🎮</h3>
              <div className="flex justify-around mt-2">
                <span>Game ID: <span className="font-semibold">{currentGameDetails.gameId}</span></span>
                <span>Opponent: <span className="font-semibold">{currentGameDetails.opponent.slice(0,6)}...{currentGameDetails.opponent.slice(-4)}</span></span>
                <span>You are Player: <span className="font-semibold">{currentGameDetails.isPlayer1 ? '1' : '2'}</span></span>
              </div>
            </div>
            <GameTable 
              key={currentGameDetails.gameId} 
              gameId={currentGameDetails.gameId}
              opponentAddress={currentGameDetails.opponent}
              isPlayer1={currentGameDetails.isPlayer1}
              account={account}
              p2pService={p2pService}
              onGameEnd={handleGameEnd} 
            />
          </div>
        );
      } else {
         // Fallback if game details are missing
        currentViewContent = <p>Loading game table...</p>;
        // Consider redirecting to PLAYER_POOL if state is inconsistent
        // useEffect(() => { if (!currentGameDetails && uiView === UI_VIEWS.GAME_TABLE) setUiView(UI_VIEWS.PLAYER_POOL); }, [currentGameDetails, uiView]);
      }
      break;
    case UI_VIEWS.ERROR:
      currentViewContent = (
        <div className="text-center py-20 bg-red-800 bg-opacity-30 p-6 rounded">
          <h2 className="text-3xl mb-4 text-red-400">Oops! Something went wrong.</h2>
          <p className="text-lg">{errorMessage}</p>
          <button 
            onClick={() => {
              setErrorMessage('');
              setUiView(UI_VIEWS.PLAYER_POOL); // Attempt to recover to a safe view
              fetchPlayerData(); // Refresh data
            }}
            className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white font-semibold"
          >
            Try Again
          </button>
        </div>
      );
      break;
    default: // Should ideally not be reached if uiView is always valid
      currentViewContent = <p>Loading...</p>; 
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-wider">⚔️ Crypto Card Duels 🃏</h1>
          <WalletConnect 
            onConnect={(ethProvider, connectedAccount) => {
              console.log('Wallet connected:', connectedAccount);
              setProvider(new ethers.providers.Web3Provider(ethProvider));
              setAccount(connectedAccount);
              // Initial data fetch and view setting is handled by useEffect watching 'account' & 'provider'
              setIsLoading(true); // Set loading true, useEffect will take over
              setUiView(UI_VIEWS.LOADING_TRANSACTION); // Show loading while services initialize
            }}
            onDisconnect={() => {
              console.log('Wallet disconnected');
              setAccount(null);
              setProvider(null);
              setContractService(null);
              setP2PService(null);
              setPlayerData({ balance: "0", staked: false, availableForMatching: false, poolSize: 0 });
              setCurrentGameDetails(null);
              setGameHistory([]);
              setUiView(UI_VIEWS.CONNECT_WALLET);
              setIsLoading(false);
              setErrorMessage('');
              setActiveTxHash(null);
            }}
          />
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* Global error message display, distinct from the ERROR view's content */}
        {errorMessage && uiView !== UI_VIEWS.ERROR && uiView !== UI_VIEWS.LOADING_TRANSACTION && (
           <div className="bg-red-700 bg-opacity-80 text-white p-3 rounded mb-4 shadow-lg flex justify-between items-center">
            <span>Error: {errorMessage.length > 100 ? errorMessage.slice(0,100) + "..." : errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="ml-4 text-xl font-bold hover:text-red-300">&times;</button>
          </div>
        )}
        {currentViewContent}
      </main>
    </div>
  );
}

export default App;