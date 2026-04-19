const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @route   POST /api/payments/create-intent
// @desc    Create a payment intent for a booking
// @access  Private
router.post('/create-intent', protect, async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'inr',
      metadata: {
        bookingId,
        userId: req.user._id.toString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ 
      message: 'Failed to create payment intent',
      error: error.message 
    });
  }
});

// @route   POST /api/payments/confirm
// @desc    Confirm payment and update booking
// @access  Private
router.post('/confirm', protect, async (req, res) => {
  try {
    const { paymentIntentId, bookingId } = req.body;

    // Retrieve payment intent to confirm status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        message: 'Payment not successful',
        status: paymentIntent.status 
      });
    }

    // Update booking payment status
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify booking belongs to user
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    booking.paymentStatus = 'paid';
    booking.paymentId = paymentIntentId;
    booking.status = 'confirmed'; // Auto-confirm booking after payment

    // Add timeline entry
    booking.timeline.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Payment confirmed',
      updatedBy: req.user._id
    });

    await booking.save();

    // Get updated booking with populated data
    const updatedBooking = await Booking.findById(bookingId)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .populate('service', 'title category price images');

    res.json({
      message: 'Payment confirmed successfully',
      booking: updatedBooking,
      paymentIntent
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ 
      message: 'Failed to confirm payment',
      error: error.message 
    });
  }
});

// @route   GET /api/payments/history
// @desc    Get payment history for user
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const Booking = require('../models/Booking');
    
    // Build query based on user role
    let query = { paymentStatus: 'paid' };
    
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'provider') {
      query.provider = req.user._id;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const payments = await Booking.find(query)
      .populate('customer', 'name email')
      .populate('provider', 'name email')
      .populate('service', 'title category')
      .select('paymentId price paymentStatus status scheduledDate createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Booking.countDocuments(query);

    res.json({
      payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/payments/payment-methods
// @desc    Get saved payment methods for user
// @access  Private
router.get('/payment-methods', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // For now, return empty array - in production, integrate with Stripe Customer API
    res.json({
      paymentMethods: user.paymentMethods || []
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/payments/payment-methods
// @desc    Save a payment method for user
// @access  Private
router.post('/payment-methods', protect, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ message: 'Payment method ID is required' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add payment method to user's saved methods
    if (!user.paymentMethods) {
      user.paymentMethods = [];
    }
    
    user.paymentMethods.push({
      id: paymentMethodId,
      isDefault: user.paymentMethods.length === 0
    });

    await user.save();

    res.json({
      message: 'Payment method saved successfully',
      paymentMethods: user.paymentMethods
    });
  } catch (error) {
    console.error('Save payment method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/payments/payment-methods/:paymentMethodId
// @desc    Delete a saved payment method
// @access  Private
router.delete('/payment-methods/:paymentMethodId', protect, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;

    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove payment method from user's saved methods
    user.paymentMethods = user.paymentMethods.filter(
      method => method.id !== paymentMethodId
    );

    await user.save();

    res.json({
      message: 'Payment method deleted successfully',
      paymentMethods: user.paymentMethods
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/payments/refund
// @desc    Process a refund
// @access  Private
router.post('/refund', protect, async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment intent ID is required' });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount // Optional - if not provided, refund full amount
    });

    // Update booking status if refund is successful
    if (refund.status === 'succeeded') {
      const Booking = require('../models/Booking');
      await Booking.findOneAndUpdate(
        { paymentId: paymentIntentId },
        { 
          paymentStatus: 'refunded',
          status: 'cancelled',
          $push: {
            timeline: {
              status: 'refunded',
              timestamp: new Date(),
              note: 'Payment refunded',
              updatedBy: req.user._id
            }
          }
        }
      );
    }

    res.json({
      message: 'Refund processed successfully',
      refund
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ 
      message: 'Failed to process refund',
      error: error.message 
    });
  }
});

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhooks
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!', paymentIntent.id);
      
      // You can update your database here
      // For example, mark booking as paid
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      
      // Handle failed payment
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

module.exports = router;
