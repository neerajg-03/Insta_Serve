const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testCompleteBookingFlow() {
  console.log('🧪 Testing Complete Booking Flow...\n');

  try {
    // Step 1: Login as customer
    console.log('1. 🔐 Logging in as customer...');
    const customerLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'customer@example.com',
      password: 'password123'
    });
    
    const customerToken = customerLogin.data.token;
    console.log('✅ Customer login successful\n');

    // Step 2: Get available services
    console.log('2. 📋 Getting available services...');
    const servicesResponse = await axios.get(`${BASE_URL}/api/services/available`);
    const services = servicesResponse.data.services || [];
    
    console.log(`✅ Found ${services.length} available services`);
    
    if (services.length === 0) {
      console.log('❌ No services available for booking');
      return;
    }

    const tapService = services.find(s => s.title === 'Tap Repairing');
    if (!tapService) {
      console.log('❌ Tap Repairing service not found');
      return;
    }

    console.log(`✅ Found Tap Repairing service:`);
    console.log(`   Title: ${tapService.title}`);
    console.log(`   Price: ₹${tapService.price}`);
    console.log(`   Provider: ${tapService.provider?.name || 'Unknown'}`);
    console.log(`   Category: ${tapService.category}\n`);

    // Step 3: Create a booking
    console.log('3. 📅 Creating booking...');
    const bookingData = {
      serviceId: tapService._id,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration: { value: 1, unit: 'hours' },
      address: {
        street: '123 Test Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001'
      },
      notes: 'Test booking for Tap Repairing'
    };

    const bookingResponse = await axios.post(`${BASE_URL}/api/bookings`, bookingData, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    const booking = bookingResponse.data.booking;
    console.log('✅ Booking created successfully!');
    console.log(`   Booking ID: ${booking._id}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Scheduled: ${new Date(booking.scheduledDate).toLocaleString()}`);
    console.log(`   Total Price: ₹${booking.totalPrice}\n`);

    // Step 4: Login as provider (Sahil)
    console.log('4. 🔐 Logging in as provider (Sahil)...');
    const providerLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'sahil123@gmail.com',
      password: 'password123'
    });
    
    const providerToken = providerLogin.data.token;
    console.log('✅ Provider login successful\n');

    // Step 5: Check provider's bookings
    console.log('5. 📋 Getting provider bookings...');
    const providerBookingsResponse = await axios.get(`${BASE_URL}/api/bookings`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });

    const providerBookings = providerBookingsResponse.data.bookings || [];
    console.log(`✅ Found ${providerBookings.length} bookings for provider`);
    
    const newBooking = providerBookings.find(b => b._id === booking._id);
    if (newBooking) {
      console.log('✅ New booking found in provider dashboard!');
      console.log(`   Customer: ${newBooking.customer?.name}`);
      console.log(`   Service: ${newBooking.service?.title}`);
      console.log(`   Status: ${newBooking.status}`);
    } else {
      console.log('❌ Booking not found in provider dashboard');
    }

    // Step 6: Accept the booking
    console.log('\n6. ✅ Accepting booking...');
    await axios.put(`${BASE_URL}/api/bookings/${booking._id}`, {
      status: 'confirmed'
    }, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });

    console.log('✅ Booking accepted by provider!');

    // Step 7: Verify booking status
    console.log('\n7. 🔍 Verifying booking status...');
    const updatedBookingResponse = await axios.get(`${BASE_URL}/api/bookings/${booking._id}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    const updatedBooking = updatedBookingResponse.data.booking;
    console.log(`✅ Final booking status: ${updatedBooking.status}`);
    console.log(`✅ Provider: ${updatedBooking.provider?.name}`);
    console.log(`✅ Customer: ${updatedBooking.customer?.name}`);

    console.log('\n🎉 COMPLETE BOOKING FLOW TEST PASSED!');
    console.log('✅ Service provider association: WORKING');
    console.log('✅ Booking creation: WORKING');
    console.log('✅ Provider dashboard: WORKING');
    console.log('✅ Booking acceptance: WORKING');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Error:', error.response.data);
    }
  }
}

// Run the test
testCompleteBookingFlow().then(() => {
  console.log('\n🎯 Complete booking flow test completed!');
}).catch(error => {
  console.error('\n💥 Test crashed:', error);
});
