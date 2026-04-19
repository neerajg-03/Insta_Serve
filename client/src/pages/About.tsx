import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  UserGroupIcon,
  StarIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BoltIcon,
  HeartIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  HandThumbUpIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface Testimonial {
  id: number;
  name: string;
  service: string;
  rating: number;
  comment: string;
  avatar: string;
  location: string;
  date: string;
}

const About: React.FC = () => {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    const mockTestimonials: Testimonial[] = [
      {
        id: 1,
        name: "Sarah Johnson",
        service: "Home Cleaning",
        rating: 5,
        comment: "Amazing service! The provider was professional and did an excellent job. Highly recommend InstaServe!",
        avatar: "SJ",
        location: "Delhi",
        date: "2 days ago"
      },
      {
        id: 2,
        name: "Michael Chen",
        service: "AC Repair",
        rating: 5,
        comment: "Quick response time and expert service. My AC was fixed within hours. Great platform!",
        avatar: "MC",
        location: "Mumbai",
        date: "1 week ago"
      },
      {
        id: 3,
        name: "Emily Rodriguez",
        service: "Plumbing",
        rating: 4,
        comment: "Reliable and affordable. The plumber arrived on time and solved the issue efficiently.",
        avatar: "ER",
        location: "Bangalore",
        date: "2 weeks ago"
      },
      {
        id: 4,
        name: "David Kim",
        service: "Electrical Work",
        rating: 5,
        comment: "Professional electrician with great knowledge. Safety was prioritized throughout the service.",
        avatar: "DK",
        location: "Pune",
        date: "3 weeks ago"
      }
    ];
    setTestimonials(mockTestimonials);
  }, []);



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
              About InstaServe
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Your trusted platform for connecting with local service providers. 
              <span className="font-semibold text-blue-600"> Live.</span> 
              <span className="font-semibold text-purple-600"> Reliable.</span> 
              <span className="font-semibold text-green-600"> Professional.</span>
            </p>
            
          </div>
        </div>
      </div>



      {/* Our Story & Mission */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Our Story */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <RocketLaunchIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Our Story</h2>
            </div>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Founded in 2024, InstaServe was born from a simple idea: connecting people who need services with trusted local professionals. We noticed that finding reliable service providers in your area shouldn't be complicated.
              </p>
              <p>
                What started as a small platform has grown into a comprehensive marketplace serving thousands of customers across multiple service categories. Our mission remains the same: to make quality services accessible to everyone.
              </p>
              <p>
                Today, we're proud to be the fastest-growing service marketplace in India, with thousands of verified providers and millions of happy customers.
              </p>
            </div>
          </div>

          {/* Our Mission */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-xl">
                <LightBulbIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
            </div>
            <div className="space-y-6">
              {[
                { icon: UserGroupIcon, title: "Connect", desc: "Bridge gap between customers and trusted service providers" },
                { icon: ShieldCheckIcon, title: "Quality", desc: "Ensure every provider is verified and delivers exceptional service" },
                { icon: HeartIcon, title: "Trust", desc: "Build a community where safety and reliability are paramount" }
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-2 rounded-xl flex-shrink-0">
                    <item.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <StarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">The principles that guide everything we do</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: ShieldCheckIcon, title: "Trust", desc: "Verified providers and secure transactions", color: "from-blue-600 to-blue-700" },
              { icon: StarIcon, title: "Quality", desc: "Exceptional service delivery", color: "from-green-600 to-green-700" },
              { icon: BoltIcon, title: "Speed", desc: "Quick and easy booking", color: "from-purple-600 to-purple-700" },
              { icon: HeartIcon, title: "Community", desc: "Building local connections", color: "from-orange-600 to-orange-700" }
            ].map((value, index) => (
              <div key={index} className="text-center group">
                <div className={`bg-gradient-to-r ${value.color} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <value.icon className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Testimonials */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Real experiences from real customers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <StarIconSolid
                      key={i}
                      className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">{testimonial.comment}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium">{testimonial.service}</span>
                  <span>{testimonial.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="bg-white/20 backdrop-blur-lg p-4 rounded-2xl">
                <RocketLaunchIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Growing Community</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
              Whether you're looking for reliable services or want to offer your skills, 
              InstaServe is the platform for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Join as Provider</span>
                <ArrowRightIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/services')}
                className="bg-white/20 backdrop-blur-lg text-white px-8 py-4 rounded-xl font-bold hover:bg-white/30 transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 border border-white/30"
              >
                <span>Browse Services</span>
                <SparklesIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
