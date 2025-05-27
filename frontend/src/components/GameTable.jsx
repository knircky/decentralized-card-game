import React, { useState, useEffect, useRef } from 'react';
import { gameLogic } from '../services/gameLogic';

// Props are now gameId, opponentAddress, isPlayer1 directly instead of a 'game' object
function GameTable({ gameId, opponentAddress, isPlayer1, account, p2pService, onGameEnd }) {
  const [gameState, setGameState] = useState('waiting');
  const [myCard, setMyCard] = useState(null); // Stores { value: number, secret: string }
  const [opponentCard, setOpponentCard] = useState(null);
  const [myCommit, setMyCommit] = useState(null);
  const [opponentCommit, setOpponentCommit] = useState(null);
  const [result, setResult] = useState(null); // Stores the winner's address or null for a tie
  const [finalGameDataForParent, setFinalGameDataForParent] = useState(null); // To store data for onGameEnd
  
  // Use refs to prevent double initialization
  const gameInitialized = useRef(false);
  const listenersSetup = useRef(false);

  useEffect(() => {
    if (listenersSetup.current) return;
    listenersSetup.current = true;
    
    console.log('GameTable: Setting up P2P listeners...');
    
    // Set up P2P message handlers
    p2pService.on('commit', (data) => {
      console.log('GameTable: Received commit from opponent:', data);
      setOpponentCommit(data.commit);
    });

    p2pService.on('reveal', (data) => {
      console.log('GameTable: Received reveal from opponent:', data);
      setOpponentCard(data.card);
    });

    p2pService.on('connected', () => {
      console.log('GameTable: P2P connected!');
      if (!gameInitialized.current) {
        gameInitialized.current = true;
        setGameState('connected');
        startGame();
      }
    });

    return () => {
      console.log('GameTable: Component unmounting, cleaning up...');
      p2pService.removeAllListeners();
      gameInitialized.current = false;
      listenersSetup.current = false;
    };
  }, []); // Empty deps - only run once

  // Watch for both commits
  useEffect(() => {
    if (myCommit && opponentCommit && gameState === 'committed') {
      console.log('GameTable: Both commits ready, revealing...');
      setGameState('revealing');
      
      // Reveal after delay
      setTimeout(() => {
        p2pService.send('reveal', { 
          card: myCard.value, 
          secret: myCard.secret 
        });
      }, 1000);
    }
  }, [myCommit, opponentCommit, gameState, myCard, p2pService]);

  // Watch for both cards revealed
  useEffect(() => {
    if (myCard?.value !== undefined && opponentCard !== undefined && gameState === 'revealing') {
      console.log('GameTable: Both cards revealed, determining winner');
      determineWinner(myCard.value, opponentCard);
    }
  }, [myCard, opponentCard, gameState]); // myCard is now an object

  const startGame = async () => {
    console.log('GameTable: Starting game...');
    
    // Generate card and commit
    const { card, secret, commit } = gameLogic.generateCardAndCommit();
    console.log('GameTable: Generated card value:', card);
    
    setMyCard({ value: card, secret: secret }); // Store as object
    setMyCommit(commit);
    setGameState('committed');
    setFinalGameDataForParent(null); // Reset for new game
    
    // Send commit to opponent
    setTimeout(() => {
      p2pService.send('commit', { commit });
    }, 100);
  };

  const determineWinner = async (myCardValue, opponentCardValue) => {
    console.log('GameTable: Determining winner - my card value:', myCardValue, 'opponent card value:', opponentCardValue);
    
    const winner = gameLogic.determineWinner(
      myCardValue, 
      opponentCardValue,
      account, // My account
      opponentAddress // Opponent's account from props
    );

    console.log('GameTable: Winner determined:', winner);
    setResult(winner); // winner is an address or null
    setGameState('finished');

    // Prepare data for onGameEnd callback
    const gameData = {
      gameId: gameId, // from props
      player1: isPlayer1 ? account : opponentAddress,
      player2: isPlayer1 ? opponentAddress : account,
      winner: winner,
      myCard: myCardValue,
      opponentCard: opponentCardValue,
      timestamp: Date.now(), // Local timestamp for when the game finished on client
      // For App.jsx to fill for its own gameHistory:
      isPlayer1FromGameTable: isPlayer1, 
      opponentAddressFromGameTable: opponentAddress,
    };
    setFinalGameDataForParent(gameData); // Store these details

    // The local storage part in App.jsx will handle its own history
    console.log('GameTable: Game finished, data prepared for parent:', gameData);
  };

  const handlePlayAgain = () => {
    if (!finalGameDataForParent) {
      console.error("GameTable: finalGameDataForParent is not set. Cannot Play Again.");
      // Optionally, set to a default state or show error
      onGameEnd({ quit: true }); // Default to quit if data is missing
      return;
    }
    console.log('GameTable: Play Again clicked');
    onGameEnd({ ...finalGameDataForParent, playAgain: true });
    // Resetting state for a new game will be handled by App.jsx re-rendering or explicit function
    // For now, let App.jsx manage the view change which should unmount/remount or reset GameTable via key change
  };

  const handleQuit = () => {
    if (!finalGameDataForParent) {
      console.error("GameTable: finalGameDataForParent is not set. Cannot Quit.");
      onGameEnd({ quit: true }); // Default to quit if data is missing
      return;
    }
    console.log('GameTable: Quit clicked');
    onGameEnd({ ...finalGameDataForParent, quit: true });
  };

  const getCardDisplay = (value) => {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    if (value === null || value === undefined) return { rank: '?', suit: '?' };
    
    const suitIndex = Math.floor(value / 13);
    const rankIndex = value % 13;
    
    return {
      rank: ranks[rankIndex],
      suit: suits[suitIndex],
      color: suitIndex % 2 === 1 ? 'text-red-500' : 'text-black'
    };
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-green-800 rounded-lg p-8 shadow-2xl">
        <h2 className="text-3xl font-bold text-center mb-8">
          Game #{gameId} {/* Use gameId from props */}
        </h2>

        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <h3 className="text-xl mb-2">Opponent</h3>
            {/* Use opponentAddress from props */}
            <p className="text-sm text-gray-300">{opponentAddress.slice(0, 8)}...</p>
            <div className="mt-4 bg-white text-black rounded-lg p-8 w-32 h-44 flex items-center justify-center text-4xl font-bold">
              {gameState === 'finished' && opponentCard !== undefined ? (
                <span className={getCardDisplay(opponentCard).color}>
                  {getCardDisplay(opponentCard).rank}
                  {getCardDisplay(opponentCard).suit}
                </span>
              ) : (
                <span className="text-gray-400">?</span>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="text-6xl mb-4">🃏</div>
            <p className="text-xl font-semibold">
              {gameState === 'waiting' && 'Waiting for opponent...'}
              {gameState === 'connected' && 'Game Started!'}
              {gameState === 'committed' && 'Waiting for opponent...'}
              {gameState === 'revealing' && 'Revealing cards...'}
              {gameState === 'finished' && (
                result === account ? '🎉 You Win!' : 
                result === null ? '🤝 Tie!' : '😢 You Lose'
              )}
            </p>
            
            {/* Manual start for testing */}
            {gameState === 'waiting' && (
              <button 
                onClick={() => {
                  if (!gameInitialized.current) {
                    gameInitialized.current = true;
                    setGameState('connected');
                    startGame();
                  }
                }}
                className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
              >
                Start Game (Skip P2P)
              </button>
            )}

            {/* Game result and buttons */}
            {gameState === 'finished' && (
              <div className="mt-6 space-y-3">
                <div className="text-lg font-bold">
                  {result === account && '🎉 You won 10 tokens!'}
                  {result === null && '🤝 Tie - No tokens exchanged'}
                  {result !== account && result !== null && '💸 You lost 10 tokens'}
                </div>
                
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={handlePlayAgain}
                    className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-white font-semibold"
                  >
                    🎮 Play Again
                  </button>
                  
                  <button 
                    onClick={handleQuit}
                    className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded text-white font-semibold"
                  >
                    🚪 Quit to Menu
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center">
            <h3 className="text-xl mb-2">You</h3>
            <p className="text-sm text-gray-300">{account.slice(0, 8)}...</p>
            <div className="mt-4 bg-white text-black rounded-lg p-8 w-32 h-44 flex items-center justify-center text-4xl font-bold">
              {gameState === 'finished' && myCard ? (
                <span className={getCardDisplay(myCard.value).color}>
                  {getCardDisplay(myCard.value).rank}
                  {getCardDisplay(myCard.value).suit}
                </span>
              ) : (
                <span className="text-gray-400">?</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg">Bet: 10 tokens | Prize: 20 tokens</p>
        </div>
      </div>
    </div>
  );
}

export default GameTable;