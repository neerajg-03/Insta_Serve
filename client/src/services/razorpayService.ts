// Razorpay Payment Service Integration
import Razorpay from 'razorpay';

export interface PaymentOptions {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

class RazorpayService {
  private static instance: RazorpayService;

  static getInstance(): RazorpayService {
    if (!RazorpayService.instance) {
      RazorpayService.instance = new RazorpayService();
    }
    return RazorpayService.instance;
  }

  // Create Razorpay order
  async createOrder(options: PaymentOptions): Promise<any> {
    try {
      // In production, this should be called from your backend
      // For now, we'll use a mock order creation
      const orderData = {
        amount: options.amount * 100, // Razorpay expects amount in paise
        currency: options.currency || 'INR',
        receipt: options.receipt || `receipt_${Date.now()}`,
        notes: {
          ...options.notes,
          bookingId: options.bookingId,
          customerName: options.customerName,
          customerEmail: options.customerEmail,
          customerPhone: options.customerPhone
        }
      };

      // Mock order creation - in production, call your backend API
      const mockOrder = {
        id: `order_${Date.now()}`,
        entity: 'order',
        amount: orderData.amount,
        amount_paid: 0,
        amount_due: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
        notes: orderData.notes,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000)
      };

      return mockOrder;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error('Failed to create payment order');
    }
  }

  // Initialize Razorpay payment
  initializePayment(order: any, options: PaymentOptions): Promise<PaymentResponse> {
    return new Promise((resolve, reject) => {
      const razorpay = new (window as any).Razorpay({
        key: 'rzp_test_1DP5mmOlF5G5ag', // Test key - replace with your actual key
        amount: order.amount,
        currency: order.currency,
        name: 'InstaServe',
        description: `Payment for booking ${options.bookingId}`,
        image: '/logo.png', // Add your logo
        order_id: order.id,
        handler: (response: PaymentResponse) => {
          console.log('Payment successful:', response);
          resolve(response);
        },
        prefill: {
          name: options.customerName,
          email: options.customerEmail,
          contact: options.customerPhone
        },
        notes: order.notes,
        theme: {
          color: '#6366f1' // Blue theme matching your app
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'));
          },
          escape: true,
          backdropclose: false,
          animate: true
        }
      });

      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        reject(new Error(response.error.description || 'Payment failed'));
      });

      razorpay.open();
    });
  }

  // Process payment
  async processPayment(options: PaymentOptions): Promise<PaymentResponse> {
    try {
      // Step 1: Create order
      const order = await this.createOrder(options);
      
      // Step 2: Initialize payment
      const response = await this.initializePayment(order, options);
      
      // Step 3: Verify payment on backend (in production)
      await this.verifyPayment(response);
      
      return response;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  // Verify payment with backend
  private async verifyPayment(response: PaymentResponse): Promise<void> {
    try {
      // In production, send this to your backend for verification
      // For now, we'll just log it
      console.log('Verifying payment:', response);
      
      // Mock verification - in production, call your backend API
      const verificationData = {
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature
      };

      console.log('Payment verification data:', verificationData);
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw new Error('Payment verification failed');
    }
  }

  // Load Razorpay script
  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => {
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Razorpay script'));
      };

      document.head.appendChild(script);
    });
  }
}

export default RazorpayService.getInstance();
