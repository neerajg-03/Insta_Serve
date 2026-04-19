import React, { useState, useEffect, useCallback } from 'react';
import { walletAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Razorpay from 'razorpay';
import {
  WalletIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CogIcon,
  PlusIcon,
  GiftIcon,
  ReceiptRefundIcon,
  CurrencyDollarIcon,
  ClockIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface WalletData {
  balance: number;
  totalCredits: number;
  totalDebits: number;
  lastRecharge: string | null;
  isActive: boolean;
  settings: {
    autoRecharge: {
      enabled: boolean;
      amount: number;
      threshold: number;
    };
    notifications: {
      lowBalance: boolean;
      creditAlert: boolean;
      debitAlert: boolean;
    };
  };
}

interface Transaction {
  _id: string;
  type: 'credit' | 'debit' | 'refund' | 'bonus' | 'penalty';
  amount: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  paymentMethod?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  metadata: any;
}

interface WalletStats {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  thisMonthCredits: number;
  thisMonthDebits: number;
  lastMonthCredits: number;
  lastMonthDebits: number;
}

const Wallet: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Recharge modal state
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  
  // Filter state
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [walletRes, transactionsRes, statsRes] = await Promise.all([
        walletAPI.getWallet(),
        walletAPI.getTransactions({ limit: 50 }),
        walletAPI.getStats()
      ]);
      
      if (walletRes.success) {
        setWallet(walletRes.wallet);
      }
      
      if (transactionsRes.success) {
        setTransactions(transactionsRes.transactions);
      }
      
      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch wallet data');
      toast.error('Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amount > 10000) {
      toast.error('Maximum recharge amount is Rs. 10,000');
      return;
    }

    try {
      setRechargeLoading(true);
      
      // Step 1: Create Razorpay order
      const orderResponse = await walletAPI.createRazorpayOrder(amount);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create payment order');
      }
      
      const { order, keyId } = orderResponse;
      
      // Step 2: Initialize Razorpay payment
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'InstaServe',
        description: 'Wallet Recharge',
        order_id: order.id,
        handler: async (response: any) => {
          try {
            // Step 3: Verify payment and recharge wallet
            const verifyResponse = await walletAPI.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amount
            });
            
            if (verifyResponse.success) {
              toast.success('Wallet recharged successfully!');
              setShowRechargeModal(false);
              setRechargeAmount('');
              fetchWalletData(); // Refresh data
            } else {
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to verify payment');
          }
        },
        prefill: {
          email: '', // You can get this from user context
          contact: '', // You can get this from user context
        },
        notes: {
          userId: '', // You can get this from user context
          type: 'wallet_recharge'
        },
        theme: {
          color: '#9333ea' // Purple theme to match app
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled');
          }
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      
      if (error.response?.data?.code === 'PAYMENT_NOT_CONFIGURED') {
        toast.error('Payment gateway not configured. Please contact administrator.');
      } else if (error.response?.data?.code === 'RAZORPAY_ERROR') {
        toast.error(error.response.data.message || 'Payment gateway error');
      } else {
        toast.error(error.response?.data?.message || 'Failed to initiate payment');
      }
    } finally {
      setRechargeLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <ArrowTrendingDownIcon className="w-5 h-5 text-green-600" />;
      case 'debit':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-red-600" />;
      case 'refund':
        return <ReceiptRefundIcon className="w-5 h-5 text-blue-600" />;
      case 'bonus':
        return <GiftIcon className="w-5 h-5 text-purple-600" />;
      case 'penalty':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />;
      default:
        return <CurrencyDollarIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'debit':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'refund':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'bonus':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'penalty':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-600" />;
      case 'cancelled':
        return <XCircleIcon className="w-4 h-4 text-gray-600" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesSearch = searchTerm === '' || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.referenceId && transaction.referenceId.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const quickRechargeAmounts = [100, 200, 500, 1000, 2000];

  if (loading && !wallet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-white/80 hover:text-white transition-colors">
                <HomeIcon className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold">My Wallet</h1>
                <p className="text-purple-100">Manage your payments and transactions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchWalletData}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                disabled={loading}
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                <CogIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Balance Card */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-lg mb-2">Available Balance</p>
                <p className="text-5xl font-bold mb-4">Rs. {wallet?.balance || 0}</p>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                    <span>Total Credits: Rs. {wallet?.totalCredits || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                    <span>Total Debits: Rs. {wallet?.totalDebits || 0}</span>
                  </div>
                </div>
                {wallet?.lastRecharge && (
                  <p className="text-purple-100 text-sm mt-3">
                    Last recharge: {new Date(wallet.lastRecharge).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <button
                  onClick={() => setShowRechargeModal(true)}
                  className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold flex items-center"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Recharge Wallet
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">This Month Credits</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">Rs. {stats.thisMonthCredits}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {stats.lastMonthCredits > 0 ? 
                      `+${((stats.thisMonthCredits - stats.lastMonthCredits) / stats.lastMonthCredits * 100).toFixed(1)}% from last month` : 
                      'No previous data'
                    }
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <ArrowTrendingDownIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">This Month Debits</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">Rs. {stats.thisMonthDebits}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {stats.lastMonthDebits > 0 ? 
                      `+${((stats.thisMonthDebits - stats.lastMonthDebits) / stats.lastMonthDebits * 100).toFixed(1)}% from last month` : 
                      'No previous data'
                    }
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Transactions</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalTransactions}</p>
                  <p className="text-xs text-gray-500 mt-2">All time activity</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-bold text-gray-900 mb-4 sm:mb-0">Transaction History</h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                {/* Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Transactions</option>
                  <option value="credit">Credits</option>
                  <option value="debit">Debits</option>
                  <option value="refund">Refunds</option>
                  <option value="bonus">Bonus</option>
                  <option value="penalty">Penalties</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <WalletIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || filterType !== 'all' ? 'Try adjusting your search or filters' : 'Start by recharging your wallet'}
                </p>
                {!searchTerm && filterType === 'all' && (
                  <button
                    onClick={() => setShowRechargeModal(true)}
                    className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Recharge Wallet
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{transaction.description}</p>
                        <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </span>
                          {transaction.referenceId && (
                            <span className="flex items-center">
                              <ReceiptRefundIcon className="w-4 h-4 mr-1" />
                              ID: {transaction.referenceId.slice(0, 8)}...
                            </span>
                          )}
                          <span className="flex items-center">
                            {getStatusIcon(transaction.status)}
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.type === 'credit' || transaction.type === 'refund' || transaction.type === 'bonus' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' || transaction.type === 'refund' || transaction.type === 'bonus' ? '+' : '-'}
                        Rs. {transaction.amount}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getTransactionColor(transaction.type)}`}>
                        {transaction.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Recharge Wallet</h3>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircleIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (Rs.)</label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  max="10000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Amounts</label>
                <div className="grid grid-cols-3 gap-2">
                  {quickRechargeAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setRechargeAmount(amount.toString())}
                      className="px-3 py-2 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-colors font-medium"
                    >
                      Rs. {amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CreditCardIcon className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="text-sm text-purple-700">
                    Secure payment via Razorpay (Card, UPI, NetBanking & more)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowRechargeModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRecharge}
                disabled={rechargeLoading || !rechargeAmount}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rechargeLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <BanknotesIcon className="w-4 h-4 mr-2 inline" />
                    Pay Rs. {rechargeAmount || '0'} via Razorpay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
