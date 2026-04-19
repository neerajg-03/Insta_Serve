const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit', 'debit', 'refund', 'bonus', 'penalty'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  referenceId: {
    type: String,
    required: false // Can reference booking ID, payment ID, etc.
  },
  referenceType: {
    type: String,
    enum: ['booking', 'recharge', 'refund', 'bonus', 'penalty'],
    required: false
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'card', 'upi', 'netbanking', 'cash'],
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalCredits: {
    type: Number,
    required: true,
    default: 0
  },
  totalDebits: {
    type: Number,
    required: true,
    default: 0
  },
  lastRecharge: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  transactions: [walletTransactionSchema],
  settings: {
    autoRecharge: {
      enabled: { type: Boolean, default: false },
      amount: { type: Number, default: 0 },
      threshold: { type: Number, default: 0 }
    },
    notifications: {
      lowBalance: { type: Boolean, default: true },
      creditAlert: { type: Boolean, default: true },
      debitAlert: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
walletSchema.index({ user: 1 });
walletSchema.index({ 'transactions.createdAt': -1 });

// Instance methods
walletSchema.methods.credit = function(amount, description, referenceId = null, referenceType = null, metadata = {}) {
  this.balance += amount;
  this.totalCredits += amount;
  
  const transaction = {
    type: 'credit',
    amount,
    description,
    referenceId,
    referenceType,
    metadata,
    status: 'completed',
    createdAt: new Date()
  };
  
  this.transactions.push(transaction);
  return this.save();
};

walletSchema.methods.debit = function(amount, description, referenceId = null, referenceType = null, metadata = {}) {
  if (this.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }
  
  this.balance -= amount;
  this.totalDebits += amount;
  
  const transaction = {
    type: 'debit',
    amount,
    description,
    referenceId,
    referenceType,
    metadata,
    status: 'completed',
    createdAt: new Date()
  };
  
  this.transactions.push(transaction);
  return this.save();
};

walletSchema.methods.getTransactions = function(limit = 50, offset = 0) {
  return this.transactions
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    })
    .slice(offset, offset + limit);
};

walletSchema.methods.getTransactionHistory = function(filters = {}) {
  let query = { user: this.user };
  
  if (filters.type) {
    query['transactions.type'] = filters.type;
  }
  
  if (filters.startDate && filters.endDate) {
    query['transactions.createdAt'] = {
      $gte: filters.startDate,
      $lte: filters.endDate
    };
  }
  
  return this.model('Wallet').findOne(query)
    .select('transactions')
    .then(wallet => {
      if (!wallet) return [];
      return wallet.transactions
        .filter(transaction => {
          if (filters.type && transaction.type !== filters.type) return false;
          if (filters.startDate && transaction.createdAt && new Date(transaction.createdAt) < filters.startDate) return false;
          if (filters.endDate && transaction.createdAt && new Date(transaction.createdAt) > filters.endDate) return false;
          return true;
        })
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
    });
};

// Static methods
walletSchema.statics.findOrCreateByUser = function(userId) {
  return this.findOne({ user: userId })
    .then(wallet => {
      if (wallet) return wallet;
      
      // Create new wallet if not found
      return this.create({
        user: userId,
        balance: 0,
        totalCredits: 0,
        totalDebits: 0
      });
    });
};

walletSchema.statics.getUserBalance = function(userId) {
  return this.findOne({ user: userId, isActive: true })
    .select('balance')
    .then(wallet => wallet ? wallet.balance : 0);
};

// Pre-save middleware
walletSchema.pre('save', function(next) {
  // Ensure balance never goes negative
  if (this.balance < 0) {
    this.balance = 0;
  }
  
  // Update last recharge if this is a credit transaction with recharge type
  const lastTransaction = this.transactions[this.transactions.length - 1];
  if (lastTransaction && lastTransaction.type === 'credit' && lastTransaction.referenceType === 'recharge') {
    this.lastRecharge = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Wallet', walletSchema);
