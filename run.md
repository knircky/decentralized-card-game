# 1. Install contract dependencies (root directory)
cd C:\dev\decentralized-card-game\
npm install

# 2. Compile contracts
npx hardhat compile

# 3. Start local Hardhat node (Terminal 1 - keep this running)
npx hardhat node

# 4. Deploy contract to local network (Terminal 2)
npx hardhat run scripts/deploy.js --network localhost
# Note the deployed address from console output!

# 5. Install frontend dependencies
cd frontend
npm install

# 6. Update frontend .env with contract address
# Create/edit .env file with:
echo REACT_APP_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 > .env
echo REACT_APP_CHAIN_ID=1337 >> .env
# Replace address with actual deployed address from step 4

# 7. Install signaling server dependencies
cd ..\signaling-server
npm init -y
npm install express socket.io cors

# 8. Run signaling server (Terminal 3 - keep running)
node index.js

# 9. Run frontend (Terminal 4 - keep running)
cd ..\frontend
npm run dev

# 10. Configure MetaMask
# - Add Custom Network:
#   Network Name: Hardhat Local
#   RPC URL: http://localhost:8545
#   Chain ID: 1337
#   Currency Symbol: ETH
# - Import test accounts using private keys from Terminal 1 (hardhat node output)