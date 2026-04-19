import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../store/slices/authSlice';
import { RootState } from '../store';
import toast from 'react-hot-toast';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer' as 'customer' | 'provider',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    }
  });
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await dispatch(registerUser(formData) as any);
      if (result.meta.requestStatus === 'fulfilled') {
        const user = result.payload.user;
        toast.success('Registration successful!');
        
        // Redirect based on user role
        if (user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (user.role === 'provider') {
          navigate('/provider', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        toast.error(result.payload || 'Registration failed');
      }
    } catch (error) {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 input"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 input"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="mt-1 input"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                I want to
              </label>
              <select
                id="role"
                name="role"
                required
                className="mt-1 input"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="customer">Hire Service Providers</option>
                <option value="provider">Offer Services</option>
              </select>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Address</h3>
              
              <div>
                <label htmlFor="street" className="block text-sm text-gray-600">
                  Street Address
                </label>
                <input
                  id="street"
                  name="address.street"
                  type="text"
                  className="mt-1 input"
                  placeholder="123 Main St"
                  value={formData.address.street}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm text-gray-600">
                    City
                  </label>
                  <input
                    id="city"
                    name="address.city"
                    type="text"
                    className="mt-1 input"
                    placeholder="Mumbai"
                    value={formData.address.city}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm text-gray-600">
                    State
                  </label>
                  <input
                    id="state"
                    name="address.state"
                    type="text"
                    className="mt-1 input"
                    placeholder="Maharashtra"
                    value={formData.address.state}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pincode" className="block text-sm text-gray-600">
                  Pincode
                </label>
                <input
                  id="pincode"
                  name="address.pincode"
                  type="text"
                  className="mt-1 input"
                  placeholder="400001"
                  value={formData.address.pincode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            By creating an account, you agree to our{' '}
            <button type="button" className="text-primary-600 hover:text-primary-500">
              Terms of Service
            </button>{' '}
            and{' '}
            <button type="button" className="text-primary-600 hover:text-primary-500">
              Privacy Policy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
