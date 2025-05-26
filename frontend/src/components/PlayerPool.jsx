import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function PlayerPool({ contractService, playerData, onDataUpdate, onEnterMatchmaking, onWithdrawAndQuit }) {
  const [stakeAmount, setStakeAmount] = useState('100');
  const [isJoining, setIsJoining] = useState(false);
  const [poolPlayers, setPoolPlayers] = useState([]);

  useEffect(() => {
    if (contractService) {
      loadPoolPlayers();
    }
  }, [contractService, playerData]);

  const loadPoolPlayers = async () => {
    try {
      const players = await contractService.getPlayerPool();
      setPoolPlayers(players);
    } catch (error) {
      console.error('Error loading pool players:', error);
    }
  };

  const handleJoinPool = async () => {
    if (!contractService) return;

    setIsJoining(true);
    try {
      await contractService.joinPool(stakeAmount);
      onDataUpdate(); // This will trigger a refresh of playerData in App.jsx
    } catch (error) {
      console.error('Error joining pool:', error);
      alert('Failed to join pool: ' + (error?.data?.message || error.message));
    } finally {
      setIsJoining(false);
    }
  };

  if (!playerData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Player Pool</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Your Status</h3>
          <p>Balance: {playerData.balance} tokens</p>
          {playerData.staked ? (
            playerData.availableForMatching ? (
              <p className="text-yellow-300">Status: Staked (Waiting for match in pool)</p>
            ) : (
              <p className="text-green-400">Status: Staked (Game ended or not in matchmaking)</p>
            )
          ) : (
            <p className="text-red-400">Status: Not Staked</p>
          )}
          <p>Players in Pool: {playerData.poolSize}</p>
        </div>

        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Game Rules</h3>
          <ul className="text-sm space-y-1">
            <li>• Bet: 10 tokens per game</li>
            <li>• Winner takes 20 tokens</li>
            <li>• Tie: Both keep their bet</li>
            <li>• Minimum stake: 100 tokens</li>
          </ul>
        </div>
      </div>

      {!playerData.staked && (
        // PLAYER IS NOT STAKED - Show stake input and join button
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Stake Amount (ETH) - Min 100
            </label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              min="100"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              placeholder="Minimum 100 ETH"
            />
          </div>
          
          <button
            onClick={handleJoinPool}
            disabled={isJoining || parseFloat(stakeAmount) < 100}
            className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining Pool...' : 'Join Pool'}
          </button>
        </div>
      )}

      {playerData.staked && playerData.availableForMatching && (
        // PLAYER IS STAKED AND WAITING FOR MATCH
        <div className="space-y-4">
          <div className="bg-yellow-600 bg-opacity-20 border border-yellow-600 rounded p-4">
            <p className="text-yellow-300 font-semibold">
              ✅ You're in the pool! Waiting for opponent...
            </p>
            <p className="text-sm mt-1">
              You'll be automatically matched when another player is available.
            </p>
          </div>
          <button
            onClick={onWithdrawAndQuit}
            className="w-full bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded"
          >
            Withdraw Funds & Quit
          </button>
        </div>
      )}

      {playerData.staked && !playerData.availableForMatching && (
        // PLAYER IS STAKED BUT NOT IN MATCHMAKING (e.g., game ended)
        <div className="space-y-4">
           <p className="text-green-400 text-center">Game ended or you are not currently in matchmaking.</p>
          <button
            onClick={onEnterMatchmaking}
            className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded"
          >
            Play Another Hand
          </button>
          <button
            onClick={onWithdrawAndQuit}
            className="w-full bg-red-600 hover:bg-red-700 px-6 py-3 rounded"
          >
            Withdraw Funds & Quit
          </button>
        </div>
      )}

      {poolPlayers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Waiting Players</h3>
          <div className="space-y-2">
            {poolPlayers.map((player, index) => (
              <div key={index} className="bg-gray-700 px-3 py-2 rounded text-sm">
                {player.slice(0, 8)}...{player.slice(-6)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerPool;