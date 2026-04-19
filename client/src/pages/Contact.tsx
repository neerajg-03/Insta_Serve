import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BoltIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [faqs] = useState<FAQ[]>([
    {
      id: 1,
      question: "How do I book a service on InstaServe?",
      answer: "Simply browse our services, select what you need, choose your preferred provider, and confirm your booking. You'll receive instant confirmation and real-time updates.",
      category: "Booking"
    },
    {
      id: 2,
      question: "Are the service providers verified?",
      answer: "Yes, all our service providers go through a thorough verification process including background checks, skill verification, and customer reviews to ensure quality and safety.",
      category: "Safety"
    },
    {
      id: 3,
      question: "What payment methods are accepted?",
      answer: "We accept all major credit/debit cards, UPI, net banking, and digital wallets. All payments are secure and processed through encrypted channels.",
      category: "Payment"
    },
    {
      id: 4,
      question: "Can I cancel or reschedule my booking?",
      answer: "Yes, you can cancel or reschedule your booking up to 2 hours before the service time without any charges. Refunds are processed within 24 hours.",
      category: "Booking"
    },
    {
      id: 5,
      question: "How are service providers selected?",
      answer: "Our algorithm considers proximity, availability, ratings, and expertise to match you with the best available provider in your area.",
      category: "Matching"
    },
    {
      id: 6,
      question: "What if I'm not satisfied with the service?",
      answer: "We offer a 100% satisfaction guarantee. If you're not happy with the service, we'll either arrange a re-service or provide a full refund.",
      category: "Support"
    },
    {
      id: 7,
      question: "How quickly can I get a service provider?",
      answer: "Most services are available within 30-60 minutes. Emergency services can be dispatched immediately based on provider availability in your area.",
      category: "Availability"
    },
    {
      id: 8,
      question: "Is my personal information secure?",
      answer: "Absolutely. We use industry-standard encryption and never share your personal information with third parties without your consent.",
      category: "Privacy"
    }
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      // Send message to admin endpoint
      const response = await fetch('/api/contact/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
          type: 'user_concern'
        })
      });

      if (response.ok) {
        toast.success('Message sent to admin successfully! We\'ll get back to you within 24 hours.');
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message. Please try again or contact us directly.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Booking': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Safety': return 'bg-green-100 text-green-800 border-green-200';
      case 'Payment': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Matching': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Support': return 'bg-red-100 text-red-800 border-red-200';
      case 'Availability': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Privacy': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Modern Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-10"></div>
        <div className="relative max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-2xl">
                <SparklesIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Contact Us
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Have questions or concerns? We're here to help. Send us a message and our admin team will respond within 24 hours.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Modern Contact Form */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center space-x-4 mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <EnvelopeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Send Message to Admin</h2>
                <p className="text-gray-600">Your concerns will be reviewed by our admin team</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="How can we help you?"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Please describe your concern or question in detail..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending to Admin...</span>
                  </>
                ) : (
                  <>
                    <span>Send Message to Admin</span>
                    <EnvelopeIcon className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Modern Contact Information */}
          <div className="space-y-8">
            {/* Quick Contact */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-4 mb-8">
                <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-xl">
                  <PhoneIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Get in Touch</h2>
                  <p className="text-gray-600">Multiple ways to reach us</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center">
                    <EnvelopeIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Email Support</h3>
                    <p className="text-gray-600">admin@instaserve.com</p>
                    <p className="text-sm text-blue-600">Response within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100">
                  <div className="bg-gradient-to-r from-green-600 to-blue-600 w-12 h-12 rounded-xl flex items-center justify-center">
                    <PhoneIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Phone Support</h3>
                    <p className="text-gray-600">+91 1800-123-4567</p>
                    <p className="text-sm text-green-600">Available 9 AM - 8 PM</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 w-12 h-12 rounded-xl flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Live Chat</h3>
                    <p className="text-gray-600">Available 24/7</p>
                    <button className="mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200">
                      Start Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-4 mb-8">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3 rounded-xl">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Support Hours</h2>
                  <p className="text-gray-600">When we're available to help</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="font-bold text-gray-900">Monday - Friday</span>
                  <span className="text-gray-600 font-medium">9:00 AM - 8:00 PM</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="font-bold text-gray-900">Saturday</span>
                  <span className="text-gray-600 font-medium">10:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="font-bold text-gray-900">Sunday</span>
                  <span className="text-gray-600 font-medium">11:00 AM - 4:00 PM</span>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-800">Emergency Support</span>
                    <span className="text-green-600 font-medium">24/7 Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 mb-12">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                  <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Find quick answers to common questions about InstaServe</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {faqs.map((faq) => (
                <div key={faq.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(faq.category)}`}>
                        {faq.category}
                      </span>
                      <h3 className="font-bold text-gray-900">{faq.question}</h3>
                    </div>
                    <div className="flex-shrink-0">
                      {expandedFAQ === faq.id ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </button>
                  
                  {expandedFAQ === faq.id && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-white">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <div className="inline-flex items-center space-x-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-bold text-gray-900">Still have questions?</p>
                  <p className="text-sm text-gray-600">Our admin team is here to help</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
