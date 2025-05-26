import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function WalletConnect({ onConnect }) {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setAccount(accounts[0]);
          onConnect(provider, accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      return;
    }

    setIsConnecting(true);

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      
      // Check if on correct network (e.g., Sepolia)
      const expectedChainId = parseInt(process.env.REACT_APP_CHAIN_ID || '11155111');
      if (network.chainId !== expectedChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
          });
        } catch (switchError) {
          console.error('Failed to switch network:', switchError);
        }
      }

      setAccount(accounts[0]);
      onConnect(provider, accounts[0]);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          window.location.reload();
        } else {
          setAccount(accounts[0]);
          window.location.reload();
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    window.location.reload();
  };

  return (
    <div className="wallet-connect">
      {account ? (
        <div className="flex items-center gap-4">
          <span className="text-sm bg-gray-700 px-3 py-1 rounded">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          <button
            onClick={disconnectWallet}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
}

export default WalletConnect;