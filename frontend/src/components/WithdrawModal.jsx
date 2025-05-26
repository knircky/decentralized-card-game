import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function WithdrawModal({ contract, onClose, onWithdraw }) {
  const [gameHistory, setGameHistory] = useState([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedGames, setSelectedGames] = useState([]);

  useEffect(() => {
    // Load game history from localStorage
    const history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
    setGameHistory(history);
    // Select all games by default
    setSelectedGames(history.map((_, index) => index));
  }, []);

  const toggleGameSelection = (index) => {
    if (selectedGames.includes(index)) {
      setSelectedGames(selectedGames.filter(i => i !== index));
    } else {
      setSelectedGames([...selectedGames, index]);
    }
  };

  const calculateNetResult = () => {
    let net = 0;
    selectedGames.forEach(index => {
      const game = gameHistory[index];
      const account = contract.account.toLowerCase();
      
      if (game.winner && game.winner.toLowerCase() === account) {
        net += 10; // Won 10 tokens
      } else if (game.winner && game.winner !== ethers.constants.AddressZero) {
        net -= 10; // Lost 10 tokens
      }
      // Tie: no change
    });
    return net;
  };

  const withdraw = async () => {
    if (selectedGames.length === 0) {
      alert('Please select games to withdraw');
      return;
    }

    setIsWithdrawing(true);
    try {
      // Get selected game results
      const selectedResults = selectedGames.map(index => gameHistory[index]);
      
      // Call withdraw function
      await contract.withdrawWithHistory(selectedResults);
      
      // Remove processed games from localStorage
      const remainingGames = gameHistory.filter((_, index) => !selectedGames.includes(index));
      localStorage.setItem('gameHistory', JSON.stringify(remainingGames));
      
      onWithdraw();
    } catch (error) {
      console.error('Error withdrawing:', error);
      alert('Failed to withdraw: ' + error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Withdraw Funds</h2>
        
        {gameHistory.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No games to withdraw. Play some games first!
          </p>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Select games to include in withdrawal:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {gameHistory.map((game, index) => {
                  const account = contract.account.toLowerCase();
                  const won = game.winner && game.winner.toLowerCase() === account;
                  const lost = game.winner && game.winner !== ethers.constants.AddressZero && !won;
                  
                  return (
                    <label
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGames.includes(index)}
                        onChange={() => toggleGameSelection(index)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="text-sm">
                          Game #{game.gameId} - 
                          {won && <span className="text-green-400"> Won (+10)</span>}
                          {lost && <span className="text-red-400"> Lost (-10)</span>}
                          {!won && !lost && <span className="text-yellow-400"> Tie (0)</span>}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          vs {game.player1 === contract.account ? game.player2 : game.player1}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded mb-4">
              <div className="flex justify-between items-center">
                <span>Selected Games:</span>
                <span>{selectedGames.length}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span>Net Result:</span>
                <span className={calculateNetResult() >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {calculateNetResult() >= 0 ? '+' : ''}{calculateNetResult()} tokens
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={withdraw}
                disabled={isWithdrawing || selectedGames.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-3 rounded font-semibold disabled:opacity-50"
              >
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WithdrawModal;