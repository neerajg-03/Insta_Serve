const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Get user wallet details
router.get('/', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOrCreateByUser(req.user._id);
    
    res.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        totalCredits: wallet.totalCredits,
        totalDebits: wallet.totalDebits,
        lastRecharge: wallet.lastRecharge,
        isActive: wallet.isActive,
        settings: wallet.settings
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet details'
    });
  }
});

// Get wallet balance only
router.get('/balance', protect, async (req, res) => {
  try {
    const balance = await Wallet.getUserBalance(req.user._id);
    
    res.json({
      success: true,
      balance
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance'
    });
  }
});

// Get transaction history
router.get('/transactions', protect, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, startDate, endDate } = req.query;
    
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.json({
        success: true,
        transactions: [],
        total: 0
      });
    }
    
    let transactions = wallet.getTransactions(parseInt(limit), parseInt(offset));
    
    // Apply filters
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    
    if (startDate || endDate) {
      transactions = transactions.filter(t => {
        const transactionDate = new Date(t.createdAt);
        if (startDate && transactionDate < new Date(startDate)) return false;
        if (endDate && transactionDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    res.json({
      success: true,
      transactions,
      total: wallet.transactions.length
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

// Create Razorpay order for wallet recharge
router.post('/create-order', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recharge amount'
      });
    }
    
    if (amount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum recharge amount is Rs. 10,000'
      });
    }
    
    // Check if Razorpay credentials are configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact administrator.',
        code: 'PAYMENT_NOT_CONFIGURED'
      });
    }
    
    // Convert amount to paise (Razorpay expects amount in paise)
    const amountInPaise = amount * 100;
    
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `WR_${req.user._id.toString().slice(-6)}_${Date.now().toString().slice(-6)}`,
      notes: {
        userId: req.user._id.toString(),
        type: 'wallet_recharge',
        amount: amount.toString()
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      order,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    // Handle specific Razorpay errors
    if (error.error && error.error.description) {
      return res.status(500).json({
        success: false,
        message: error.error.description,
        code: 'RAZORPAY_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      code: 'ORDER_CREATION_FAILED'
    });
  }
});

// Verify Razorpay payment and recharge wallet
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification details'
      });
    }
    
    // Verify payment signature
    const crypto = require('crypto');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    if (razorpay_signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
    
    // Fetch payment details to verify amount
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }
    
    const paymentAmount = payment.amount / 100; // Convert from paise to rupees
    
    if (paymentAmount !== amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch'
      });
    }
    
    const wallet = await Wallet.findOrCreateByUser(req.user._id);
    
    await wallet.credit(
      paymentAmount,
      `Wallet recharge via Razorpay`,
      razorpay_payment_id,
      'recharge',
      { 
        paymentMethod: 'razorpay',
        orderId: razorpay_order_id,
        signature: razorpay_signature
      }
    );
    
    res.json({
      success: true,
      message: 'Wallet recharged successfully',
      balance: wallet.balance,
      transactionId: wallet.transactions[wallet.transactions.length - 1]._id
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

// Add money to wallet (recharge) - kept for backward compatibility
router.post('/recharge', protect, async (req, res) => {
  try {
    const { amount, paymentMethod = 'card', metadata = {} } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recharge amount'
      });
    }
    
    if (amount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum recharge amount is Rs. 10,000'
      });
    }
    
    const wallet = await Wallet.findOrCreateByUser(req.user._id);
    
    // In a real application, you would integrate with a payment gateway here
    // For now, we'll simulate successful payment
    const paymentId = 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    await wallet.credit(
      amount,
      `Wallet recharge via ${paymentMethod}`,
      paymentId,
      'recharge',
      { ...metadata, paymentMethod }
    );
    
    res.json({
      success: true,
      message: 'Wallet recharged successfully',
      balance: wallet.balance,
      transactionId: wallet.transactions[wallet.transactions.length - 1]._id
    });
  } catch (error) {
    console.error('Error recharging wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recharge wallet'
    });
  }
});

// Debit money from wallet (for bookings)
router.post('/debit', protect, async (req, res) => {
  try {
    const { amount, description, referenceId, referenceType, metadata = {} } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid debit amount'
      });
    }
    
    const wallet = await Wallet.findOrCreateByUser(req.user._id);
    
    await wallet.debit(
      amount,
      description || 'Wallet payment',
      referenceId,
      referenceType || 'booking',
      metadata
    );
    
    res.json({
      success: true,
      message: 'Payment successful',
      balance: wallet.balance,
      transactionId: wallet.transactions[wallet.transactions.length - 1]._id
    });
  } catch (error) {
    console.error('Error debiting wallet:', error);
    if (error.message === 'Insufficient wallet balance') {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to process payment'
    });
  }
});

// Add bonus money (admin only)
router.post('/bonus', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const { userId, amount, description, metadata = {} } = req.body;
    
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or amount'
      });
    }
    
    const wallet = await Wallet.findOrCreateByUser(userId);
    
    await wallet.credit(
      amount,
      description || 'Bonus credit',
      null,
      'bonus',
      metadata
    );
    
    res.json({
      success: true,
      message: 'Bonus added successfully',
      balance: wallet.balance
    });
  } catch (error) {
    console.error('Error adding bonus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add bonus'
    });
  }
});

// Update wallet settings
router.put('/settings', protect, async (req, res) => {
  try {
    const { settings } = req.body;
    
    const wallet = await Wallet.findOrCreateByUser(req.user._id);
    
    // Update settings
    if (settings.autoRecharge) {
      wallet.settings.autoRecharge = { ...wallet.settings.autoRecharge, ...settings.autoRecharge };
    }
    
    if (settings.notifications) {
      wallet.settings.notifications = { ...wallet.settings.notifications, ...settings.notifications };
    }
    
    await wallet.save();
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: wallet.settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Get wallet statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    
    if (!wallet) {
      return res.json({
        success: true,
        stats: {
          totalTransactions: 0,
          totalCredits: 0,
          totalDebits: 0,
          thisMonthCredits: 0,
          thisMonthDebits: 0,
          lastMonthCredits: 0,
          lastMonthDebits: 0
        }
      });
    }
    
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const thisMonthTransactions = wallet.transactions.filter(t => new Date(t.createdAt) >= thisMonth);
    const lastMonthTransactions = wallet.transactions.filter(t => {
      const date = new Date(t.createdAt);
      return date >= lastMonth && date < thisMonth;
    });
    
    const thisMonthCredits = thisMonthTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const thisMonthDebits = thisMonthTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const lastMonthCredits = lastMonthTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const lastMonthDebits = lastMonthTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      success: true,
      stats: {
        totalTransactions: wallet.transactions.length,
        totalCredits: wallet.totalCredits,
        totalDebits: wallet.totalDebits,
        thisMonthCredits,
        thisMonthDebits,
        lastMonthCredits,
        lastMonthDebits
      }
    });
  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet statistics'
    });
  }
});

module.exports = router;
