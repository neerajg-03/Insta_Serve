import { loadStripe } from '@stripe/stripe-js';
import { paymentsAPI } from './api';

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
  bookingId: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

class PaymentService {
  private static instance: PaymentService;
  private stripe: any = null;

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  // Initialize Stripe
  async initializeStripe(): Promise<void> {
    if (!this.stripe) {
      const stripePublicKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_51234567890abcdef';
      this.stripe = await loadStripe(stripePublicKey);
    }
  }

  // Create payment intent for booking
  async createPaymentIntent(bookingId: string, amount: number): Promise<PaymentIntent> {
    try {
      const response = await paymentsAPI.createPaymentIntent({
        bookingId,
        amount: amount * 100, // Stripe uses cents
        currency: 'inr'
      });
      return response;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm payment with Stripe
  async confirmPayment(clientSecret: string, paymentMethodId?: string): Promise<PaymentResult> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      return {
        success: false,
        error: 'Payment confirmation failed'
      };
    }
  }

  // Process payment for booking
  async processPayment(bookingId: string, amount: number, paymentMethodId?: string): Promise<PaymentResult> {
    try {
      // Initialize Stripe
      await this.initializeStripe();

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(bookingId, amount);

      // Confirm payment
      const result = await this.confirmPayment(paymentIntent.clientSecret, paymentMethodId);

      if (result.success) {
        // Update booking status on backend
        await paymentsAPI.confirmPayment({
          paymentIntentId: result.paymentIntentId,
          bookingId
        });
      }

      return result;
    } catch (error) {
      console.error('Error processing payment:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  // Get payment methods for user
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await paymentsAPI.getPaymentMethods();
      return response.paymentMethods || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  // Save payment method
  async savePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      await paymentsAPI.savePaymentMethod({ paymentMethodId });
      return true;
    } catch (error) {
      console.error('Error saving payment method:', error);
      return false;
    }
  }

  // Delete payment method
  async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      await paymentsAPI.deletePaymentMethod(paymentMethodId);
      return true;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return false;
    }
  }

  // Get payment history
  async getPaymentHistory(): Promise<any[]> {
    try {
      const response = await paymentsAPI.getPaymentHistory();
      return response.payments || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  // Refund payment
  async refundPayment(paymentIntentId: string, amount?: number): Promise<boolean> {
    try {
      await paymentsAPI.refundPayment({
        paymentIntentId,
        amount: amount ? amount * 100 : undefined // Stripe uses cents
      });
      return true;
    } catch (error) {
      console.error('Error processing refund:', error);
      return false;
    }
  }

  // Create payment element for Stripe Elements
  createPaymentElement(): any {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }
    
    const elements = this.stripe.elements();
    return elements.create('payment', {
      layout: 'tabs'
    });
  }

  // Mount payment element to DOM
  mountPaymentElement(element: any, containerId: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      element.mount(container);
    }
  }
}

export default PaymentService.getInstance();
