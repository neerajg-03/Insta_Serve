import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  HomeIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  CogIcon,
  BoltIcon,
  WrenchIcon,
  CheckCircleIcon,
  LockClosedIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  StarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CalendarIcon,
  HandThumbUpIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

const Home: React.FC = () => {
  const categories = [
    {
      name: 'Home Cleaning',
      icon: HomeIcon,
      description: 'Professional cleaning services for your home',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Beauty & Wellness',
      icon: SparklesIcon,
      description: 'Salon, spa, and wellness services',
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50'
    },
    {
      name: 'Appliance Repair',
      icon: WrenchScrewdriverIcon,
      description: 'Expert repair for all home appliances',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Plumbing',
      icon: CogIcon,
      description: 'Professional plumbing services',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      name: 'Electrical',
      icon: BoltIcon,
      description: 'Safe and reliable electrical work',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Carpentry',
      icon: WrenchIcon,
      description: 'Custom woodworking and repairs',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const features = [
    {
      title: 'Verified Professionals',
      description: 'All service providers are background checked and verified',
      icon: CheckCircleIcon,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Secure Payments',
      description: 'Safe and secure payment processing with multiple options',
      icon: LockClosedIcon,
      color: 'from-green-500 to-green-600'
    },
    {
      title: '24/7 Support',
      description: 'Round-the-clock customer support for all your needs',
      icon: PhoneIcon,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Transparent Pricing',
      description: 'Clear pricing with no hidden charges',
      icon: CurrencyDollarIcon,
      color: 'from-yellow-500 to-yellow-600'
    }
  ];

  const stats = [
    { value: '10,000+', label: 'Service Providers' },
    { value: '50,000+', label: 'Happy Customers' },
    { value: '100,000+', label: 'Services Completed' },
    { value: '4.8/5', label: 'Average Rating' }
  ];

  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reviews from API
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await api.get('/bookings/reviews?limit=6');
        
        if (response.data.success) {
          setTestimonials(response.data.testimonials);
        } else {
          setError('Failed to load reviews');
        }
      } catch (err: any) {
        console.error('Error fetching reviews:', err);
        // Don't set error for 401s during initial load, just use fallback
        if (err.response?.status !== 401) {
          setError('Failed to load reviews');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  // Fallback testimonials if API fails
  const fallbackTestimonials = [
    {
      _id: 'fallback-1',
      name: 'Sarah Johnson',
      service: 'Home Cleaning',
      content: 'InstaServe made it so easy to find a reliable cleaner. The provider was professional and did an amazing job!',
      rating: 5
    },
    {
      _id: 'fallback-2',
      name: 'Mike Chen',
      service: 'Appliance Repair',
      content: 'Quick response time and expert service. My refrigerator was fixed within hours. Highly recommend!',
      rating: 5
    },
    {
      _id: 'fallback-3',
      name: 'Emily Davis',
      service: 'Beauty & Wellness',
      content: 'Found an amazing spa service through InstaServe. The booking process was seamless and the experience was wonderful.',
      rating: 5
    }
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : fallbackTestimonials;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <StarSolidIcon className="w-4 h-4 text-yellow-300 mr-2" />
              <span className="text-sm font-medium">Trusted by 50,000+ customers</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Your Trusted Service
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
                Marketplace
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-3xl mx-auto leading-relaxed">
              Connect with verified local professionals for all your home service needs. Quality service, guaranteed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/services"
                className="group inline-flex items-center px-8 py-4 bg-white text-indigo-600 hover:bg-gray-50 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Browse Services
                <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/register"
                className="group inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 text-lg font-semibold rounded-xl transition-all duration-300"
              >
                Become a Provider
                <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 mr-2 text-green-300" />
                <span>Verified Professionals</span>
              </div>
              <div className="flex items-center">
                <LockClosedIcon className="w-5 h-5 mr-2 text-green-300" />
                <span>Secure Payments</span>
              </div>
              <div className="flex items-center">
                <PhoneIcon className="w-5 h-5 mr-2 text-green-300" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Popular Service Categories
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find the right professional for your needs from our wide range of services
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category, index) => {
              const IconComponent = category.icon;
              return (
                <Link
                  key={index}
                  to="/services"
                  className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  <div className="relative p-8">
                    <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${category.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-300">
                      {category.name}
                    </h3>
                    <p className="text-gray-600 mb-4">{category.description}</p>
                    <div className="flex items-center text-indigo-600 font-semibold group-hover:text-purple-600 transition-colors duration-300">
                      <span>Explore Services</span>
                      <ArrowRightIcon className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose InstaServe?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We make finding and booking services simple, secure, and satisfying
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="group text-center">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                    <div className={`relative inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get your service done in 4 simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Search', description: 'Find the service you need', icon: MagnifyingGlassIcon },
              { step: '2', title: 'Compare', description: 'Compare providers and prices', icon: ChartBarIcon },
              { step: '3', title: 'Book', description: 'Book your preferred service', icon: CalendarIcon },
              { step: '4', title: 'Relax', description: 'Get your service done', icon: HandThumbUpIcon }
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="relative group">
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-indigo-200 to-purple-200 -z-10"></div>
                  )}
                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform duration-300">
                        {item.step}
                      </div>
                    </div>
                    <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real experiences from satisfied customers
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="animate-pulse">
                    <div className="flex mb-4">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="w-5 h-5 bg-gray-200 rounded-full mr-1"></div>
                      ))}
                    </div>
                    <div className="h-20 bg-gray-200 rounded mb-6"></div>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-gray-600">
              <p className="text-lg">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {displayTestimonials.map((testimonial, index) => (
                <div key={testimonial._id || index} className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating || 5)].map((_, i) => (
                      <StarSolidIcon key={i} className="w-5 h-5 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {testimonial.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.service}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
            <StarSolidIcon className="w-4 h-4 text-yellow-300 mr-2" />
            <span className="text-sm font-medium">Join 50,000+ happy customers</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-2xl mx-auto leading-relaxed">
            Join thousands of satisfied customers and trusted service providers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group inline-flex items-center px-8 py-4 bg-white text-indigo-600 hover:bg-gray-50 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Sign Up Now
              <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/services"
              className="group inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 text-lg font-semibold rounded-xl transition-all duration-300"
            >
              Explore Services
              <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </section>
    </div>
  );
};

export default Home;
