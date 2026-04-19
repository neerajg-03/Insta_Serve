const io = require('socket.io-client');

console.log('🧪 Testing Socket.IO connection...');

// Test connection to the server
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Socket.IO connection successful!');
  console.log('📡 Server is running and Socket.IO is properly configured');
  
  // Test authentication
  socket.emit('authenticate', {
    userId: 'test-user',
    name: 'Test User',
    role: 'customer'
  });
  
  // Disconnect after test
  setTimeout(() => {
    socket.disconnect();
    console.log('🔌 Test completed');
    process.exit(0);
  }, 3000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection failed:', error.message);
  
  if (error.message === 'Invalid namespace') {
    console.log('🔍 This usually means:');
    console.log('   1. Server is not running');
    console.log('   2. Socket.IO not properly configured on server');
    console.log('   3. Wrong server URL');
  }
  
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('⏰ Connection timeout - server may not be running');
  process.exit(1);
}, 10000);
