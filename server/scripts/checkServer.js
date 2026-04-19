const http = require('http');

console.log('🔍 Checking if server is running on port 5000...');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log('✅ Server is running!');
  console.log(`📡 Status: ${res.statusCode}`);
  console.log('🌐 Server responded successfully');
  
  if (res.statusCode === 200) {
    console.log('🎉 Server is ready for Socket.IO connections');
  }
});

req.on('error', (err) => {
  console.error('❌ Server connection failed:', err.message);
  
  if (err.code === 'ECONNREFUSED') {
    console.log('🔍 This means:');
    console.log('   1. Server is not running');
    console.log('   2. Server is running on a different port');
    console.log('   3. Firewall is blocking the connection');
    console.log('');
    console.log('💡 To fix this:');
    console.log('   1. Start the server: npm run server');
    console.log('   2. Check if port 5000 is available');
    console.log('   3. Verify server configuration');
  }
});

req.on('timeout', () => {
  console.error('⏰ Connection timeout - server may be starting up');
});

req.end();
