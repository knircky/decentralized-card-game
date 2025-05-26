import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function PlayerPool({ contract, playerData, onDataUpdate }) {
  const [stakeAmount, setStakeAmount] = useState('100');
  const [isJoining, setIsJoining] = useState(false);
  const [poolPlayers, setPoolPlayers] = useState([]);

  useEffect(() => {
    if (contract) {
      loadPoolPlayers();
    }
  }, [contract, playerData]);

  const loadPoolPlayers = async () => {
    try {
      const players = await contract.getPlayerPool();
      setPoolPlayers(players);
    } catch (error) {
      console.error('Error loading pool players:', error);
    }
  };

  const joinPool = async () => {
    if (!contract) return;

    setIsJoining(true);
    try {
      await contract.joinPool(stakeAmount);
      onDataUpdate();
    } catch (error) {
      console.error('Error joining pool:', error);
      alert('Failed to join pool: ' + error.message);
    } finally {
      setIsJoining(false);
    }
  };

  const leavePool = async () => {
    if (!contract) return;

    try {
      await contract.leavePool();
      onDataUpdate();
    } catch (error) {
      console.error('Error leaving pool:', error);
      alert('Failed to leave pool: ' + error.message);
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
          <p>In Pool: {playerData.inPool ? 'Yes' : 'No'}</p>
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

      {playerData.inPool ? (
        // PLAYER IS IN POOL - Show waiting message
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
            onClick={leavePool}
            className="w-full bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded"
          >
            Leave Pool (and withdraw funds)
          </button>
        </div>
      ) : (
        // PLAYER IS NOT IN POOL - Show stake input and join button
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Stake Amount (tokens)
            </label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              min="100"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              placeholder="Minimum 100 tokens"
            />
          </div>
          
          <button
            onClick={joinPool}
            disabled={isJoining || parseInt(stakeAmount) < 100}
            className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining Pool...' : 'Join Pool'}
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