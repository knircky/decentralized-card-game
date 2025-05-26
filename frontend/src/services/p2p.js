import { io } from 'socket.io-client';

export class P2PService {
  constructor(account) {
    this.account = account.toLowerCase();
    this.socket = io('ws://localhost:3001');
    this.listeners = new Map();
    this.gameId = null;
    this.opponent = null;
    this.connected = false;
    
    console.log('P2P: Initializing simple P2P for account:', this.account);
    
    this.socket.on('connect', () => {
      console.log('P2P: Connected to signaling server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('P2P: Disconnected from signaling server');
    });
    
    // Listen for direct messages
    this.socket.on('game-message', (data) => {
      console.log('P2P: Received game message:', data);
      if (data.to.toLowerCase() === this.account.toLowerCase() && data.gameId === this.gameId) {
        console.log('P2P: Processing message for this player:', data.type);
        this.emit(data.type, data.data);
      } else {
        console.log('P2P: Message not for this player - to:', data.to, 'my account:', this.account);
      }
    });
  }

  connectToGame(gameId, opponentAddress) {
    console.log('P2P: Connecting to game:', { gameId, opponentAddress });
    this.gameId = gameId;
    this.opponent = opponentAddress;
    
    // Join the game room
    this.socket.emit('join-game', { 
      gameId, 
      account: this.account 
    });
    
    // Simulate connection after short delay
    setTimeout(() => {
      console.log('P2P: ✅ SIMPLE P2P CONNECTED!');
      this.connected = true;
      this.emit('connected');
    }, 1000);
  }

  send(type, data) {
    console.log('P2P: Sending message (simple mode):', { type, data });
    if (this.connected && this.socket.connected) {
      this.socket.emit('game-message', {
        gameId: this.gameId,
        from: this.account,
        to: this.opponent,
        type,
        data
      });
      console.log('P2P: Message sent successfully');
    } else {
      console.error('P2P: Cannot send - not connected');
    }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    console.log('P2P: Added listener for event:', event);
  }

  once(event, handler) {
    const wrappedHandler = (...args) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      const handlers = this.listeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, ...args) {
    console.log('P2P: Emitting event:', event, args);
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(handler => handler(...args));
    }
  }

  removeAllListeners() {
    console.log('P2P: Removing all listeners');
    this.listeners.clear();
  }

  disconnect() {
    console.log('P2P: Disconnecting...');
    this.connected = false;
    this.socket.disconnect();
  }
}