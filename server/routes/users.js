const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'kycDocuments') {
      cb(null, 'uploads/kyc/');
    } else if (file.fieldname === 'profilePicture') {
      cb(null, 'uploads/profiles/');
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});

// @route   POST /api/users/kyc
// @desc    Upload KYC documents (provider only)
// @access  Private (Provider)
router.post('/kyc', protect, authorize('provider'), upload.array('kycDocuments', 5), async (req, res) => {
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ message: 'Documents array is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Process uploaded files
    const kycDocuments = documents.map((doc, index) => {
      const file = req.files[index];
      return {
        documentType: doc.documentType,
        documentNumber: doc.documentNumber,
        documentUrl: file ? `/uploads/kyc/${file.filename}` : null,
        uploadDate: new Date()
      };
    });

    // Update user KYC documents
    user.kycDocuments = kycDocuments;
    user.kycStatus = 'pending'; // Reset to pending when new documents are uploaded
    await user.save();

    res.json({
      message: 'KYC documents uploaded successfully',
      kycDocuments: user.kycDocuments,
      kycStatus: user.kycStatus
    });
  } catch (error) {
    console.error('Upload KYC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/kyc/status
// @desc    Get KYC status
// @access  Private
router.get('/kyc/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kycStatus kycDocuments');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      kycStatus: user.kycStatus,
      kycDocuments: user.kycDocuments
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/profile-picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile-picture', protect, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePicture = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If provider, populate their services
    if (user.role === 'provider') {
      await User.populate(user, {
        path: 'services',
        match: { isActive: true }
      });
    }

    res.json({ user: user.getProfile() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'phone', 'address'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: user.getProfile()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/settings
// @desc    Update user settings
// @access  Private
router.put('/settings', protect, async (req, res) => {
  try {
    const allowedSettings = [
      'emailNotifications',
      'smsNotifications', 
      'pushNotifications',
      'marketingEmails',
      'language',
      'currency'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedSettings.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { settings: updates } },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/providers
// @desc    Get list of verified providers
// @access  Public
router.get('/providers', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      location,
      rating 
    } = req.query;

    // Build query
    const query = {
      role: 'provider',
      isActive: true,
      kycStatus: 'approved'
    };

    if (category) {
      // Get providers who have services in this category
      const Service = require('../models/Service');
      const services = await Service.find({ 
        category, 
        isActive: true, 
        isApproved: true 
      }).distinct('provider');
      
      query._id = { $in: services };
    }

    if (rating) {
      query['ratings.average'] = { $gte: parseFloat(rating) };
    }

    if (location) {
      query['address.city'] = { $regex: location, $options: 'i' };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const providers = await User.find(query)
      .select('name email phone profilePicture ratings address services')
      .populate({
        path: 'services',
        match: { isActive: true, isApproved: true },
        select: 'title category price ratings'
      })
      .sort({ 'ratings.average': -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.json({
      providers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get public user profile
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name profilePicture ratings address services kycStatus')
      .populate({
        path: 'services',
        match: { isActive: true, isApproved: true },
        select: 'title category description price images ratings experience'
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only show KYC status to admin or the user themselves
    const publicProfile = user.getProfile();
    if (req.user && (req.user._id.toString() === req.params.id || req.user.role === 'admin')) {
      publicProfile.kycStatus = user.kycStatus;
    } else {
      delete publicProfile.kycStatus;
    }

    res.json({ user: publicProfile });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
