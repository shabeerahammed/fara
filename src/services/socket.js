import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket.io server:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket.io server');
    });
  }

  subscribeToCall(callId, callback) {
    if (!this.socket) this.connect();
    
    this.socket.emit('subscribe:call', callId);

    // Stage updates
    this.socket.on('pipeline:stage', (data) => {
      if (data.callId === callId) {
        callback(data);
      }
    });

    // End of pipeline
    this.socket.on('pipeline:end', (data) => {
      if (data.callId === callId) {
        callback({ ...data, isEnd: true });
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
