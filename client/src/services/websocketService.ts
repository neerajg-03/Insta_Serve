export interface WebSocketMessage {
  type: 'location_update' | 'booking_status' | 'provider_status' | 'chat_message';
  data: any;
  timestamp: number;
  bookingId?: string;
  userId?: string;
}

export interface BookingStatusUpdate {
  bookingId: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  message?: string;
  providerLocation?: {
    lat: number;
    lng: number;
  };
  estimatedArrival?: string;
}

export interface LocationUpdate {
  bookingId: string;
  userId: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: number;
}

class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private messageCallbacks: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private isConnecting = false;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Connect to WebSocket server
  connect(userId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
        resolve();
        return;
      }

      this.isConnecting = true;
      
      // In development, use localhost; in production, use your server URL
      const wsUrl = `ws://localhost:5001?userId=${userId}&token=${token}`;
      
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    }

  // Send message to server
  sendMessage(message: Partial<WebSocketMessage>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        type: message.type || 'location_update',
        data: message.data,
        timestamp: Date.now(),
        bookingId: message.bookingId,
        userId: message.userId
      };
      
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  // Subscribe to specific message types
  subscribe(messageType: string, callback: (message: WebSocketMessage) => void): void {
    if (!this.messageCallbacks.has(messageType)) {
      this.messageCallbacks.set(messageType, []);
    }
    this.messageCallbacks.get(messageType)!.push(callback);
  }

  // Unsubscribe from message types
  unsubscribe(messageType: string, callback: (message: WebSocketMessage) => void): void {
    const callbacks = this.messageCallbacks.get(messageType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage): void {
    const callbacks = this.messageCallbacks.get(message.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(message));
    }
  }

  // Handle reconnection logic
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        // You'll need to get userId and token from storage/state
        const userId = localStorage.getItem('userId') || '';
        const token = localStorage.getItem('token') || '';
        this.connect(userId, token).catch(console.error);
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Send location update
  sendLocationUpdate(bookingId: string, location: { lat: number; lng: number }): void {
    this.sendMessage({
      type: 'location_update',
      bookingId,
      data: {
        location,
        timestamp: Date.now()
      }
    });
  }

  // Send booking status update
  sendBookingStatusUpdate(update: BookingStatusUpdate): void {
    this.sendMessage({
      type: 'booking_status',
      bookingId: update.bookingId,
      data: update
    });
  }

  // Check connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Get connection state
  getConnectionState(): string {
    if (!this.ws) return 'DISCONNECTED';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'CONNECTED';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
}

export default WebSocketService.getInstance();
