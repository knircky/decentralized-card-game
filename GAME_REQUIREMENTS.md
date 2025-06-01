# Decentralized Card Game - Build Requirements

## Game Overview (Plain English)

This is a decentralized card game where players join a shared pool with real money, get matched into pairwise channels, and play multiple high-card hands efficiently off-chain. Players deposit 100+ tokens to enter the pool and get automatically paired with opponents to create temporary 2-player channels. Within each channel, players play individual hands costing 10 tokens each using a commit-reveal system, updating their channel balances after each game. When players are done, they cooperatively close the channel by submitting a final signed settlement to the blockchain - winner takes accumulated winnings, loser gets remaining balance. If disputes arise, the blockchain can verify the cryptographic evidence to determine the real outcome. This creates ultra-fast gaming with minimal blockchain costs through state channel efficiency.

## Core Mechanics
- **Pool Entry**: Players deposit 100+ tokens to join the global game pool
- **Channel Creation**: Pool automatically pairs players into 2-player state channels
- **Channel Gameplay**: Each hand costs 10 tokens, balances updated off-chain after each game
- **Card Logic**: Simple high-card wins (card values 0-51, Ace high)
- **Channel Settlement**: When leaving, both players sign final balances for instant payout
- **Pool Re-entry**: After settling a channel, players can rejoin pool for new opponents

## State Channel Flow
1. Players get matched from pool and open a funded channel
2. Play multiple games within the channel, updating balances after each game
3. Both players maintain signed channel states with latest balances
4. When either wants to leave, propose final settlement
5. Both sign final state and submit to blockchain for instant payout
6. Players can rejoin pool to start new channels with different opponents

## Cooperative Settlement
- Channel closes when both players sign final balances
- Single blockchain transaction settles entire gaming session
- Immediate payout according to signed final state
- Minimal gas costs regardless of games played in channel

## Dispute Resolution
- If players disagree on final balances, either can dispute
- Submit latest signed channel state as evidence
- Smart contract verifies signatures and determines valid state
- False disputers pay penalties to encourage cooperation
- Disputed channels take longer to settle but still resolve fairly

## Security Requirements
- All channel state updates must be cryptographically signed by both players
- Commit-reveal prevents card manipulation within games
- Monotonic nonce prevents replay of old channel states
- Complete message history stored for dispute evidence
- Economic incentives make cooperation cheaper than disputes

## Implementation Constraints
- Contract manages pool matching and channel settlement only
- All gameplay happens in P2P channels off-chain
- Blockchain verification only needed for disputed channels
- Channels are always between exactly 2 players
- Multiple channels can run simultaneously from the same pool
- No trusted third parties required for any operations

This creates a highly scalable, gas-efficient card game that combines the speed of off-chain gaming with the security guarantees of blockchain settlement through state channel architecture.