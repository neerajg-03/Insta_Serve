const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/kyc';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload KYC document
router.post('/upload/kyc-document', protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { documentType } = req.body;
    
    if (!documentType) {
      // Clean up uploaded file if document type is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Document type is required' });
    }

    // Create file URL
    const documentUrl = `/uploads/kyc/${req.file.filename}`;

    res.json({
      message: 'Document uploaded successfully',
      documentUrl: documentUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if error occurred
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Upload failed',
      error: error.message 
    });
  }
});

// Submit KYC documents
router.post('/kyc', protect, async (req, res) => {
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ message: 'Documents are required' });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is a provider
    if (user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can submit KYC documents' });
    }

    // Check if KYC is already submitted and approved
    if (user.kycStatus === 'approved') {
      return res.status(400).json({ message: 'KYC already approved' });
    }

    // Validate each document
    for (const doc of documents) {
      if (!doc.documentType || !doc.documentNumber || !doc.documentUrl) {
        return res.status(400).json({ 
          message: 'All documents must have type, number, and URL' 
        });
      }
    }

    // Check for duplicate document numbers across all users
    const documentNumbers = documents.map(doc => doc.documentNumber);
    const existingUsers = await User.find({
      'kycDocuments.documentNumber': { $in: documentNumbers },
      _id: { $ne: req.user._id }
    });

    if (existingUsers.length > 0) {
      const duplicateNumbers = existingUsers.flatMap(user => 
        user.kycDocuments
          .filter(doc => documentNumbers.includes(doc.documentNumber))
          .map(doc => doc.documentNumber)
      );

      return res.status(400).json({ 
        message: `Duplicate document numbers found: ${duplicateNumbers.join(', ')}. Each document number must be unique.` 
      });
    }

    // Update user's KYC documents
    user.kycDocuments = documents.map(doc => ({
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      documentUrl: doc.documentUrl,
      uploadDate: new Date()
    }));

    user.kycStatus = 'pending';
    await user.save();

    res.json({
      message: 'KYC documents submitted successfully',
      kycStatus: user.kycStatus,
      documents: user.kycDocuments
    });

  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({ 
      message: 'KYC submission failed',
      error: error.message 
    });
  }
});

// Get KYC status
router.get('/kyc/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kycStatus kycDocuments');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      kycStatus: user.kycStatus,
      documents: user.kycDocuments
    });

  } catch (error) {
    console.error('KYC status error:', error);
    res.status(500).json({ 
      message: 'Failed to get KYC status',
      error: error.message 
    });
  }
});

// Admin routes for KYC management
router.get('/admin/kyc/pending', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const pendingUsers = await User.find({
      role: 'provider',
      kycStatus: 'pending'
    }).select('name email phone kycDocuments kycStatus createdAt');

    res.json({
      pendingUsers,
      count: pendingUsers.length
    });

  } catch (error) {
    console.error('Get pending KYC error:', error);
    res.status(500).json({ 
      message: 'Failed to get pending KYC applications',
      error: error.message 
    });
  }
});

// Approve/Reject KYC
router.post('/admin/kyc/:userId/review', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status, reason } = req.body;
    const { userId } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'provider') {
      return res.status(400).json({ message: 'User is not a provider' });
    }

    user.kycStatus = status;
    
    if (status === 'rejected' && reason) {
      user.kycRejectionReason = reason;
    }

    await user.save();

    res.json({
      message: `KYC ${status} successfully`,
      kycStatus: user.kycStatus
    });

  } catch (error) {
    console.error('KYC review error:', error);
    res.status(500).json({ 
      message: 'KYC review failed',
      error: error.message 
    });
  }
});

module.exports = router;
