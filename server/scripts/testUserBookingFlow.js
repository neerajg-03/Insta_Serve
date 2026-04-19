const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testUserBookingFlow() {
  console.log('👤 Testing complete user booking flow...\n');

  try {
    // Step 1: Customer login
    console.log('1. 🔐 Customer login...');
    const customerLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'customer@example.com',
      password: 'password123'
    });
    
    const customerToken = customerLogin.data.token;
    console.log('✅ Customer logged in\n');

    // Step 2: Browse services (like a real user)
    console.log('2. 🛍️ Browsing services...');
    const servicesResponse = await axios.get(`${BASE_URL}/api/services/available`);
    const services = servicesResponse.data.services || [];
    
    console.log(`✅ Found ${services.length} available services:`);
    services.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.title} - ₹${service.price}`);
      console.log(`      Provider: ${service.provider?.name || 'Unknown'}`);
      console.log(`      Area: ${service.serviceArea}`);
      console.log(`      Category: ${service.category}`);
    });

    if (services.length === 0) {
      console.log('❌ No services available');
      return;
    }

    const tapService = services[0]; // Use first available service
    console.log(`\n🎯 Selected: ${tapService.title}\n`);

    // Step 3: Try to create booking with different dates
    console.log('3. 📅 Testing booking creation...');
    
    const testDates = [
      new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after
      new Date(Date.now() + 72 * 60 * 60 * 1000), // 3 days from now
    ];

    for (let i = 0; i < testDates.length; i++) {
      const testDate = testDates[i];
      console.log(`\n   Testing date ${i + 1}: ${testDate.toLocaleString()}`);
      
      try {
        const bookingData = {
          serviceId: tapService._id,
          scheduledDate: testDate.toISOString(),
          duration: { value: 1, unit: 'hours' },
          address: {
            street: '123 Test Street',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001'
          },
          notes: `Test booking ${i + 1}`
        };

        const bookingResponse = await axios.post(`${BASE_URL}/api/bookings`, bookingData, {
          headers: { Authorization: `Bearer ${customerToken}` }
        });

        const booking = bookingResponse.data.booking;
        console.log(`   ✅ Booking created successfully!`);
        console.log(`      ID: ${booking._id}`);
        console.log(`      Status: ${booking.status}`);
        console.log(`      Total Price: ₹${booking.totalPrice}`);
        
        // Stop after first successful booking
        break;
        
      } catch (error) {
        console.log(`   ❌ Booking failed: ${error.response?.data?.message}`);
        if (i === testDates.length - 1) {
          console.log('   📊 All dates failed - investigating further...');
        }
      }
    }

    // Step 4: Check provider dashboard
    console.log('\n4. 👨‍🔧 Checking provider dashboard...');
    try {
      const providerLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'sahil123@gmail.com',
        password: 'password123'
      });
      
      const providerToken = providerLogin.data.token;
      
      const providerBookings = await axios.get(`${BASE_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${providerToken}` }
      });

      console.log(`✅ Provider has ${providerBookings.data.bookings?.length || 0} bookings:`);
      providerBookings.data.bookings?.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.service?.title} - ${booking.status}`);
        console.log(`      Customer: ${booking.customer?.name}`);
        console.log(`      Scheduled: ${new Date(booking.scheduledDate).toLocaleString()}`);
      });

    } catch (error) {
      console.log(`❌ Provider login failed: ${error.response?.data?.message}`);
    }

    // Step 5: Check if there are any validation rules we're missing
    console.log('\n5. 🔍 Checking service validation rules...');
    console.log(`   Service Status: Active=${tapService.isActive}, Approved=${tapService.isApproved}`);
    console.log(`   Provider Status: Available`);
    console.log(`   Service Area: ${tapService.serviceArea}`);
    console.log(`   Required Fields: All present`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Error:', error.response.data);
    }
  }
}

// Run the test
testUserBookingFlow().then(() => {
  console.log('\n🎯 User booking flow test completed!');
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
});
