const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Coupon = require('../models/Coupon');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/admin/users/:id
// @desc    Get detailed user information for admin
// @access  Private (Admin)
router.get('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .populate({
        path: 'services',
        select: 'title category price isActive isApproved ratings bookingCount createdAt'
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin)
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      kycStatus,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (role) query.role = role;
    if (kycStatus) query.kycStatus = kycStatus;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin only)
// @access  Private (Admin)
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const allowedUpdates = ['name', 'email', 'phone', 'role', 'isActive', 'isVerified', 'kycStatus'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: user.getProfile()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/kyc/pending
// @desc    Get pending KYC applications
// @access  Private (Admin)
router.get('/kyc/pending', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find({
      role: 'provider',
      kycStatus: 'pending'
    })
      .select('name email phone kycDocuments createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments({
      role: 'provider',
      kycStatus: 'pending'
    });

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get pending KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/kyc/:userId/approve
// @desc    Approve KYC application
// @access  Private (Admin)
router.post('/kyc/:userId/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'provider') {
      return res.status(400).json({ message: 'User is not a provider' });
    }

    if (user.kycStatus !== 'pending') {
      return res.status(400).json({ message: 'KYC is not pending' });
    }

    user.kycStatus = 'approved';
    user.isVerified = true;
    await user.save();

    res.json({
      message: 'KYC approved successfully',
      userId: user._id,
      kycStatus: user.kycStatus
    });
  } catch (error) {
    console.error('Approve KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/kyc/:userId/reject
// @desc    Reject KYC application
// @access  Private (Admin)
router.post('/kyc/:userId/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'provider') {
      return res.status(400).json({ message: 'User is not a provider' });
    }

    if (user.kycStatus !== 'pending') {
      return res.status(400).json({ message: 'KYC is not pending' });
    }

    user.kycStatus = 'rejected';
    await user.save();

    res.json({
      message: 'KYC rejected successfully',
      userId: user._id,
      kycStatus: user.kycStatus,
      rejectionReason: reason
    });
  } catch (error) {
    console.error('Reject KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/services
// @desc    Get all services for admin review
// @access  Private (Admin)
router.get('/services', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      isApproved,
      isActive,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (category) query.category = category;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const services = await Service.find(query)
      .populate('provider', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Service.countDocuments(query);

    res.json({
      services,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/services
// @desc    Create a new service type
// @access  Private (Admin)
router.post('/services', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      estimatedDuration,
      basePrice,
      serviceArea,
      requirements,
      tools
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !estimatedDuration || !basePrice || !serviceArea) {
      return res.status(400).json({ 
        message: 'Please provide all required fields: title, description, category, estimatedDuration, basePrice, serviceArea' 
      });
    }

    // Map category values - frontend sends enum values directly
    const categoryMap = {
      'home_cleaning': 'home_cleaning',
      'beauty_wellness': 'beauty_wellness',
      'appliance_repair': 'appliance_repair',
      'plumbing': 'plumbing',
      'electrical': 'electrical',
      'carpentry': 'carpentry',
      'painting': 'painting',
      'pest_control': 'pest_control',
      'packers_movers': 'packers_movers',
      'home_tutoring': 'home_tutoring',
      'fitness_training': 'fitness_training',
      'event_management': 'event_management',
      'photography': 'photography',
      'web_development': 'web_development',
      'digital_marketing': 'digital_marketing',
      'other': 'other'
    };

    // Create new service
    const service = new Service({
      title,
      description,
      category: categoryMap[category] || category || 'other',
      subcategory: requirements || 'general',
      provider: null, // Admin-created services don't have a provider initially
      price: parseFloat(basePrice),
      priceType: 'fixed',
      duration: {
        value: parseInt(estimatedDuration),
        unit: 'hours'
      },
      serviceArea,
      skills: tools ? [tools] : [],
      isActive: true,
      isApproved: true,
      ratings: { average: 0, count: 0 },
      reviews: [],
      bookingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await service.save();

    // Populate provider info for response
    await service.populate('provider', 'name email phone');

    res.status(201).json({
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/services/:serviceId/approve
// @desc    Approve a service
// @access  Private (Admin)
router.post('/services/:serviceId/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.isApproved) {
      return res.status(400).json({ message: 'Service is already approved' });
    }

    service.isApproved = true;
    await service.save();

    // Update provider's services array if service has a provider
    if (service.provider) {
      await User.findByIdAndUpdate(service.provider, {
        $push: { services: service._id }
      });
    }

    const populatedService = await Service.findById(service._id)
      .populate('provider', 'name email phone');

    res.json({
      message: 'Service approved successfully',
      service: populatedService
    });
  } catch (error) {
    console.error('Approve service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get platform analytics
// @access  Private (Admin)
router.get('/analytics', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      startDate,
      endDate
    } = req.query;

    // Date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // User statistics
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProviders = await User.countDocuments({ role: 'provider' });
    const verifiedProviders = await User.countDocuments({ 
      role: 'provider', 
      kycStatus: 'approved' 
    });
    const pendingKYC = await User.countDocuments({ 
      role: 'provider', 
      kycStatus: 'pending' 
    });

    // Service statistics
    const totalServices = await Service.countDocuments({ createdBy: 'admin' });
    const activeServices = await Service.countDocuments({ 
      isActive: true, 
      isApproved: true,
      createdBy: 'admin'
    });
    const pendingServices = await Service.countDocuments({ 
      isApproved: false,
      createdBy: 'admin'
    });

    // Booking statistics
    const totalBookings = await Booking.countDocuments(dateFilter);
    const completedBookings = await Booking.countDocuments({
      ...dateFilter,
      status: 'completed'
    });
    const cancelledBookings = await Booking.countDocuments({
      ...dateFilter,
      status: 'cancelled'
    });

    // Revenue statistics
    const revenueResult = await Booking.aggregate([
      { $match: { ...dateFilter, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$price.totalPrice' } } }
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Recent activities
    const recentUsers = await User.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt');

    const recentBookings = await Booking.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'name')
      .populate('provider', 'name')
      .populate('service', 'title');

    res.json({
      users: {
        total: totalUsers,
        customers: totalCustomers,
        providers: totalProviders,
        verifiedProviders,
        pendingKYC
      },
      services: {
        total: totalServices,
        active: activeServices,
        pending: pendingServices
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        completionRate: totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(2) : 0
      },
      revenue: {
        total: totalRevenue,
        currency: 'INR'
      },
      recent: {
        users: recentUsers,
        bookings: recentBookings
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== COUPON MANAGEMENT ====================

// @route   GET /api/admin/coupons
// @desc    Get all coupons with pagination and filtering
// @access  Private (Admin)
router.get('/coupons', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      discountType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status === 'active') {
      query.isActive = true;
      query.startDate = { $lte: new Date() };
      query.endDate = { $gte: new Date() };
    } else if (status === 'inactive') {
      query.$or = [
        { isActive: false },
        { startDate: { $gt: new Date() } },
        { endDate: { $lt: new Date() } }
      ];
    }
    
    if (discountType) query.discountType = discountType;
    
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const coupons = await Coupon.find(query)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Coupon.countDocuments(query);

    res.json({
      coupons,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/coupons
// @desc    Create a new coupon
// @access  Private (Admin)
router.post('/coupons', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount = 0,
      maxDiscountAmount,
      usageLimit,
      userLimit = 1,
      applicableTo = 'all',
      applicableServices = [],
      applicableCategories = [],
      startDate,
      endDate
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      userLimit,
      applicableTo,
      applicableServices,
      applicableCategories,
      startDate,
      endDate,
      createdBy: req.user._id
    });

    await coupon.save();
    await coupon.populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/coupons/:id
// @desc    Update a coupon
// @access  Private (Admin)
router.put('/coupons/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const allowedUpdates = [
      'description', 'discountType', 'discountValue', 'minOrderAmount',
      'maxDiscountAmount', 'usageLimit', 'userLimit', 'applicableTo',
      'applicableServices', 'applicableCategories', 'startDate', 'endDate', 'isActive'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Special handling for code - only allow if not used yet
    if (req.body.code && req.body.code !== coupon.code) {
      if (coupon.usageCount > 0) {
        return res.status(400).json({ message: 'Cannot change coupon code after it has been used' });
      }
      
      const existingCoupon = await Coupon.findOne({ code: req.body.code.toUpperCase() });
      if (existingCoupon) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }
      updates.code = req.body.code.toUpperCase();
    }

    // Validate dates if both are provided
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.startDate) >= new Date(updates.endDate)) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }

    Object.assign(coupon, updates);
    await coupon.save();
    await coupon.populate('createdBy', 'name email');

    res.json({
      message: 'Coupon updated successfully',
      coupon
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/services/:id
// @desc    Delete a service
// @access  Private (Admin)
router.delete('/services/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if service has active bookings
    if (service.bookingCount > 0) {
      return res.status(400).json({ message: 'Cannot delete service that has active bookings' });
    }

    await Service.findByIdAndDelete(req.params.id);

    console.log('🗑️ Service deleted:', service.title);

    res.json({
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/coupons/:id
// @desc    Delete a coupon
// @access  Private (Admin)
router.delete('/coupons/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    if (coupon.usageCount > 0) {
      return res.status(400).json({ message: 'Cannot delete coupon that has been used' });
    }

    await Coupon.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/coupons/:id/stats
// @desc    Get coupon usage statistics
// @access  Private (Admin)
router.get('/coupons/:id/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Get bookings that used this coupon
    const couponBookings = await Booking.find({
      'coupon.code': coupon.code,
      paymentStatus: 'paid'
    }).populate('customer', 'name email')
      .populate('service', 'title')
      .sort({ createdAt: -1 });

    const totalDiscount = couponBookings.reduce((sum, booking) => {
      return sum + (booking.coupon.discountAmount || 0);
    }, 0);

    const uniqueUsers = new Set(couponBookings.map(b => b.customer._id.toString())).size;

    res.json({
      coupon: {
        code: coupon.code,
        description: coupon.description,
        usageLimit: coupon.usageLimit,
        usageCount: coupon.usageCount,
        isActive: coupon.isValid()
      },
      stats: {
        totalUsage: coupon.usageCount,
        uniqueUsers,
        totalDiscount,
        averageDiscount: coupon.usageCount > 0 ? totalDiscount / coupon.usageCount : 0,
        recentBookings: couponBookings.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Get coupon stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/provider-services/:requestId/approve
// @desc    Approve a provider's service request
// @access  Private (Admin)
router.post('/provider-services/:requestId/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { providerId } = req.body;
    const serviceId = req.params.requestId;

    console.log(' Approving provider request:', { serviceId, providerId });

    // Find the service with provider requests
    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Find the specific provider request in the providerRequests array
    const providerRequest = service.providerRequests?.find(
      request => request.provider.toString() === providerId
    );

    if (!providerRequest) {
      return res.status(404).json({ message: 'Provider request not found' });
    }

    if (providerRequest.isApproved) {
      return res.status(400).json({ message: 'Provider request is already approved' });
    }

    // Update the provider request
    providerRequest.isApproved = true;
    providerRequest.reviewedAt = new Date();
    providerRequest.reviewedBy = req.user._id;

    // Create a new service instance for the provider based on the admin template
    const newService = new Service({
      title: service.title,
      description: service.description,
      category: service.category,
      subcategory: service.subcategory,
      provider: providerId,
      price: service.price,
      priceType: service.priceType,
      duration: service.duration,
      serviceArea: service.serviceArea,
      maxDistance: service.maxDistance,
      skills: service.skills,
      images: service.images,
      isActive: true,
      isApproved: true,
      isTemplate: false,
      templateServiceId: service._id,
      createdBy: 'provider',
      ratings: { average: 0, count: 0 },
      reviews: [],
      bookingCount: 0
    });

    await newService.save();

    // Update provider's services array with the new service
    const User = require('../models/User');
    await User.findByIdAndUpdate(providerId, {
      $push: { services: newService._id }
    });

    // Mark the provider request as processed and remove it from pending
    providerRequest.isProcessed = true;
    providerRequest.processedAt = new Date();
    providerRequest.approvedServiceId = newService._id;

    await service.save(); // Save the updated service with processed request

    console.log(' Service approved:', providerRequest.title, 'by provider:', providerRequest.provider?.name);

    // Get Socket.IO instance to notify providers
    const io = req.app.get('io');
    if (io) {
      // Find all active providers to notify about new service
      const activeProviders = await User.find({
        role: 'provider',
        isActive: true
      }).select('_id name email');
      
      console.log(`Notifying ${activeProviders.length} active providers about new service: ${providerRequest.title}`);
      
      // Send notification to all active providers
      activeProviders.forEach(provider => {
        io.to(`user_${provider._id}`).emit('new_service_available', {
          service: {
            _id: providerRequest._id,
            title: providerRequest.title,
            category: providerRequest.category,
            price: providerRequest.price,
            priceType: providerRequest.priceType,
            description: providerRequest.description,
            provider: providerRequest.provider?.name,
            createdAt: providerRequest.createdAt
          },
          message: `New service "${providerRequest.title}" is now available for booking!`
        });
      });
    }

    res.json({
      message: 'Service request approved successfully',
      service: providerRequest
    });
  } catch (error) {
    console.error('Approve provider service error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/admin/provider-services/:requestId/reject
// @desc    Reject a provider's service request
// @access  Private (Admin)
router.post('/provider-services/:requestId/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { providerId, rejectionReason } = req.body;
    const serviceId = req.params.requestId;

    console.log('❌ Rejecting provider request:', { serviceId, providerId, rejectionReason });

    // Find of service with provider requests
    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Find the specific provider request
    const providerRequest = service.providerRequests?.find(
      request => request.provider.toString() === providerId
    );

    if (!providerRequest) {
      return res.status(404).json({ message: 'Provider request not found' });
    }

    if (providerRequest.isApproved) {
      return res.status(400).json({ message: 'Cannot reject an already approved request' });
    }

    // Update the provider request to mark as rejected
    providerRequest.isRejected = true;
    providerRequest.rejectionReason = rejectionReason || 'Rejected by admin';
    providerRequest.reviewedAt = new Date();
    providerRequest.reviewedBy = req.user._id;

    await service.save();

    console.log('❌ Provider request rejected:', service.title, 'by provider:', providerRequest.provider?.name);

    res.json({
      message: 'Service request rejected successfully',
      service: providerRequest
    });
  } catch (error) {
    console.error('Reject provider service error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/service-requests
// @desc    Get all provider service requests
// @access  Private (Admin)
router.get('/service-requests', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - get services that have provider requests
    const query = { 
      providerRequests: { $exists: true, $ne: [] }
    };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get services with provider requests
    const servicesWithRequests = await Service.find(query)
      .populate({
        path: 'providerRequests.provider',
        select: 'name email phone profilePicture'
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Flatten provider requests into individual request items
    const allRequests = [];
    servicesWithRequests.forEach(service => {
      service.providerRequests.forEach(request => {
        // Only include pending requests (not approved or rejected)
        if (!request.isApproved && !request.isRejected) {
          allRequests.push({
            _id: service._id, // Service ID
            serviceId: service._id,
            title: service.title,
            description: service.description,
            category: service.category,
            price: service.price,
            priceType: service.priceType,
            duration: service.duration,
            serviceArea: service.serviceArea,
            providerRequest: {
              _id: request._id,
              provider: request.provider,
              isApproved: request.isApproved,
              isRejected: request.isRejected,
              requestedAt: request.requestedAt,
              rejectionReason: request.rejectionReason
            },
            createdAt: service.createdAt
          });
        }
      });
    });

    // Get total count of pending requests
    const totalServices = await Service.countDocuments(query);
    const totalRequests = await Service.aggregate([
      { $match: query },
      { $project: { providerRequests: 1 } },
      { $unwind: '$providerRequests' },
      { $match: { 'providerRequests.isApproved': false, 'providerRequests.isRejected': false } },
      { $count: 'total' }
    ]);

    const total = totalRequests.length > 0 ? totalRequests[0].total : 0;

    res.json({
      services: allRequests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get service requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
