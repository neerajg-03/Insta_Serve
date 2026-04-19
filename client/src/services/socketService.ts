import { io, Socket } from 'socket.io-client';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface BookingUpdate {
  bookingId: string;
  status: string;
  customerId: string;
  providerId: string;
  message?: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
}

export interface UserData {
  userId: string;
  name: string;
  email: string;
  role: 'customer' | 'provider' | 'admin';
}

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private userData: UserData | null = null;

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Connect to Socket.IO server
  connect(userData: UserData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Disconnect any existing socket first
      if (this.socket) {
        console.log('🔌 Disconnecting existing socket before reconnect...');
        this.socket.disconnect();
        this.socket = null;
        this.userData = null;
      }

      this.userData = userData;

      const token = localStorage.getItem('token');
      if (!token) {
        reject(new Error('No authentication token found'));
        return;
      }

      // Try to connect with fallback options
      const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      // Remove /api from URL for Socket.IO connection
      const socketUrl = serverUrl.replace('/api', '');
      console.log('🔌 Attempting to connect to Socket.IO server:', socketUrl);

      this.socket = io(socketUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('ð [SOCKET] Connected to Socket.IO server');
        console.log('ð [SOCKET] Socket ID:', this.socket?.id);
        // Authenticate with the server
        this.socket?.emit('authenticate', userData);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
        
        // Provide more specific error handling
        if (error.message === 'Invalid namespace') {
          console.error('🔍 Server may not be running or Socket.IO not properly configured');
          reject(new Error('Server connection failed - please check if server is running'));
        } else if (error.message.includes('Authentication')) {
          reject(new Error('Authentication failed - please login again'));
        } else {
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('ð [SOCKET] Disconnected from Socket.IO server:', reason);
        console.log('ð [SOCKET] Disconnect reason details:', {
          reason,
          wasConnected: !!this.socket,
          userData: this.userData
        });
        // Don't clear userData immediately, might be useful for reconnection
        this.socket = null;
      });

      // Set up event listeners
      this.setupEventListeners();
    });
  }

  // Disconnect from Socket.IO server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userData = null;
      // Clear all callbacks
      this.locationUpdateCallbacks = [];
      this.bookingUpdateCallbacks = [];
      this.serviceRequestCallbacks = [];
      this.chatMessageCallbacks = [];
    }
  }

  // Set up event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Location updates (direct to user)
    this.socket.on('location_update', (data) => {
      console.log('📍 [DEBUG] Location update received:', data);
      console.log('📍 [DEBUG] Current user role:', this.userData?.role);
      console.log('📍 [DEBUG] Booking ID in update:', data.bookingId);
      console.log('📍 [DEBUG] Location data:', data.location);
      this.emitLocationUpdate(data);
    });

    // Provider location updates (broadcast to customers)
    this.socket.on('provider_location_update', (data) => {
      console.log('â [DEBUG] Provider location update received:', data);
      console.log('â [DEBUG] Current user role:', this.userData?.role);
      console.log('â [DEBUG] Booking ID in update:', data.bookingId);
      console.log('â [DEBUG] Location data:', data.location);
      this.emitLocationUpdate(data);
    });

    // Customer location updates (broadcast to providers)
    this.socket.on('customer_location_update', (data) => {
      console.log('â [DEBUG] Customer location update received:', data);
      console.log('â [DEBUG] Current user role:', this.userData?.role);
      console.log('â [DEBUG] Booking ID in update:', data.bookingId);
      console.log('â [DEBUG] Location data:', data.location);
      this.emitLocationUpdate(data);
    });

    // Booking updates
    this.socket.on('booking_update', (data) => {
      console.log('📢 Booking update received:', data);
      this.emitBookingUpdate(data);
    });

    // New service requests (for providers)
    this.socket.on('new_service_request', (data) => {
      console.log('🔔 New service request received:', data);
      this.emitServiceRequest(data);
    });

    // Chat messages
    this.socket.on('chat_message', (data) => {
      console.log('💬 Chat message received:', data);
      this.emitChatMessage(data);
    });

    // New service notifications for providers
    this.socket.on('new_service_available', (data) => {
      console.log('New service available notification:', data);
      this.emitNewServiceAvailable(data);
    });
  }

  // Custom event emitters for components
  private locationUpdateCallbacks: ((data: any) => void)[] = [];
  private bookingUpdateCallbacks: ((data: any) => void)[] = [];
  private serviceRequestCallbacks: ((data: any) => void)[] = [];
  private chatMessageCallbacks: ((data: any) => void)[] = [];
  private newServiceAvailableCallbacks: ((data: any) => void)[] = [];

  onLocationUpdate(callback: (data: any) => void): void {
    console.log('🔌 Registering location update callback');
    this.locationUpdateCallbacks.push(callback);
    console.log('🔌 Total location callbacks registered:', this.locationUpdateCallbacks.length);
  }

  onBookingUpdate(callback: (data: any) => void): void {
    this.bookingUpdateCallbacks.push(callback);
  }

  onServiceRequest(callback: (data: any) => void): void {
    this.serviceRequestCallbacks.push(callback);
  }

  onChatMessage(callback: (data: any) => void): void {
    this.chatMessageCallbacks.push(callback);
  }

  onNewServiceAvailable(callback: (data: any) => void): void {
    this.newServiceAvailableCallbacks.push(callback);
  }

  private async emitLocationUpdate(data: any): Promise<void> {
    console.log('🔄 Emitting location update to callbacks:', data);
    console.log('🔄 Number of location callbacks:', this.locationUpdateCallbacks.length);
    for (const callback of this.locationUpdateCallbacks) {
      await callback(data);
    }
  }

  private async emitBookingUpdate(data: any): Promise<void> {
    for (const callback of this.bookingUpdateCallbacks) {
      await callback(data);
    }
  }

  private async emitServiceRequest(data: any): Promise<void> {
    for (const callback of this.serviceRequestCallbacks) {
      await callback(data);
    }
  }

  private async emitChatMessage(data: any): Promise<void> {
    for (const callback of this.chatMessageCallbacks) {
      await callback(data);
    }
  }

  private async emitNewServiceAvailable(data: any): Promise<void> {
    for (const callback of this.newServiceAvailableCallbacks) {
      await callback(data);
    }
  }

  // Send location update
  sendLocationUpdate(location: LocationData, bookingId?: string): void {
    if (this.socket && (this.socket as any).connected) {
      const locationData = bookingId ? { ...location, bookingId } : location;
      console.log('ð [DEBUG] Sending location update:', {
        userData: this.userData,
        locationData,
        bookingId,
        socketConnected: (this.socket as any).connected
      });
      (this.socket as any).emit('location_update', locationData);
    } else {
      console.log('â [DEBUG] Cannot send location update - socket not connected:', {
        socketExists: !!this.socket,
        socketConnected: this.socket ? (this.socket as any).connected : false
      });
    }
  }

  // Send booking status update
  sendBookingUpdate(update: BookingUpdate): void {
    if (this.socket && (this.socket as any).connected) {
      (this.socket as any).emit('booking_status_update', update);
    }
  }

  // Send chat message
  sendChatMessage(message: ChatMessage): void {
    if (this.socket && (this.socket as any).connected) {
      (this.socket as any).emit('send_message', message);
    }
  }

  // Listen to specific events
  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Stop listening to specific events
  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get current user data
  getUserData(): UserData | null {
    return this.userData;
  }

  // Join a room
  joinRoom(room: string): void {
    if (this.socket && (this.socket as any).connected) {
      (this.socket as any).emit('join_room', room);
    }
  }

  // Leave a room
  leaveRoom(room: string): void {
    if (this.socket && (this.socket as any).connected) {
      (this.socket as any).emit('leave_room', room);
    }
  }

  // Join a booking room for targeted location sharing
  joinBookingRoom(bookingId: string): void {
    if (this.socket && (this.socket as any).connected) {
      console.log('ð [DEBUG] Joining booking room:', {
        bookingId,
        userData: this.userData,
        socketConnected: (this.socket as any).connected
      });
      (this.socket as any).emit('join_booking_room', bookingId);
    } else {
      console.warn('â [DEBUG] Cannot join booking room - socket not connected:', {
        bookingId,
        socketExists: !!this.socket,
        socketConnected: this.socket ? (this.socket as any).connected : false
      });
    }
  }

  // Leave a booking room
  leaveBookingRoom(bookingId: string): void {
    if (this.socket && (this.socket as any).connected) {
      console.log('🔍 [DEBUG] Leaving booking room:', {
        bookingId,
        userData: this.userData,
        socketConnected: (this.socket as any).connected
      });
      (this.socket as any).emit('leave_booking_room', bookingId);
    }
  }

  // Send chat message (alias for sendChatMessage)
  sendMessage(message: ChatMessage): void {
    this.sendChatMessage(message);
  }

  // Listen for chat messages
  onMessage(callback: (message: ChatMessage) => void): void {
    if (this.socket) {
      (this.socket as any).on('receive_message', callback);
    }
  }

  // Send typing indicator
  sendTyping(bookingId: string, isTyping: boolean): void {
    if (this.socket && (this.socket as any).connected) {
      (this.socket as any).emit('typing', { bookingId, isTyping });
    }
  }

  // Listen for typing indicators
  onTyping(callback: (data: { bookingId: string; userId: string; isTyping: boolean }) => void): void {
    if (this.socket) {
      (this.socket as any).on('user_typing', callback);
    }
  }
}

export default SocketService.getInstance();
