const express = require('express');
const multer = require('multer');
const cloudinary = require('../lib/cloudinary');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { authenticate, requireStudent } = require('../middleware/auth');
const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   POST /api/certificates
// @desc    Upload a new certificate
// @access  Private (Student only)
router.post('/', authenticate, requireStudent, upload.single('certificateImage'), async (req, res) => {
  try {
    // user is authenticated and is a student at this point

  const {
      title,
      description,
      issuer,
      certificateType,
      category,
      issueDate,
      expiryDate,
      duration,
      grade,
      skills,
      externalUrl,
      tags
    } = req.body;

    // Validate required fields
    if (!title || !issuer || !certificateType || !category || !issueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, issuer, certificate type, category, and issue date are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Certificate image is required'
      });
    }

    // Upload image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'certificates',
          transformation: [
            { width: 800, height: 600, crop: 'limit', quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Parse skills and tags arrays
    const skillsArray = skills ? skills.split(',').map(skill => skill.trim().toLowerCase()) : [];
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : [];

    // Create certificate
    const certificate = new Certificate({
      student: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      issuer: issuer.trim(),
      certificateType,
    category,
      issueDate: new Date(issueDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      fileUrl: result.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype.split('/')[1],
      duration: duration ? duration.trim() : '',
      grade: grade ? grade.trim() : '',
      skills: skillsArray,
      externalUrl: externalUrl ? externalUrl.trim() : '',
      tags: tagsArray,
      status: 'approved', // Auto-approve for now, can be changed to 'pending' for review
      isPublic: true
    });

    await certificate.save();

    // Populate student info
    await certificate.populate('student', 'firstName lastName rollNumber year section profilePicture');

    res.status(201).json({
      success: true,
      message: 'Certificate uploaded successfully!',
      data: certificate
    });

  } catch (error) {
    console.error('Certificate upload error:', error);
    
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while uploading certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/certificates/my
// @desc    Get current student's certificates
// @access  Private (Student only)
router.get('/my', authenticate, requireStudent, async (req, res) => {
  try {
    // user is a student

    const { page = 1, limit = 10, status = 'approved' } = req.query;
    const skip = (page - 1) * limit;

    const certificates = await Certificate.find({ 
      student: req.user._id,
      status: status
    })
    .sort({ createdAt: -1 })
      .skip(skip)
    .limit(parseInt(limit))
    .populate('reviewedBy', 'firstName lastName');

    const total = await Certificate.countDocuments({ 
      student: req.user._id,
      status: status
    });

  res.json({
    success: true,
    data: {
      certificates,
      pagination: {
        currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching certificates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/certificates/:id
// @desc    Delete a certificate
// @access  Private (Student only - own certificates)
router.delete('/:id', authenticate, requireStudent, async (req, res) => {
  try {
    // user is a student

    const certificate = await Certificate.findOne({
      _id: req.params.id,
      student: req.user._id
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or you do not have permission to delete it'
      });
    }

    // Delete image from Cloudinary
    try {
      const publicId = certificate.fileUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`certificates/${publicId}`);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    await Certificate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Certificate deleted successfully'
    });

  } catch (error) {
    console.error('Delete certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/certificates/feed/department
// @desc    Get department feed
// @access  Private (Student only)
router.get('/feed/department', authenticate, requireStudent, async (req, res) => {
  try {
    // user is a student

    const { page = 1, limit = 10, certificateType } = req.query;

    const certificates = await Certificate.getDepartmentFeed(
      req.user.department,
      parseInt(page),
      parseInt(limit),
      certificateType
    );

    res.json({
    success: true,
      data: certificates
    });

  } catch (error) {
    console.error('Department feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching department feed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/certificates/feed/year
// @desc    Get year feed
// @access  Private (Student only)
router.get('/feed/year', authenticate, requireStudent, async (req, res) => {
  try {
    // user is a student

    const { page = 1, limit = 10, certificateType } = req.query;

    const certificates = await Certificate.getYearFeed(
      req.user.department,
      req.user.year,
      parseInt(page),
      parseInt(limit),
      certificateType
    );

    res.json({
      success: true,
      data: certificates
    });

  } catch (error) {
    console.error('Year feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching year feed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/certificates/feed/class
// @desc    Get class feed
// @access  Private (Student only)
router.get('/feed/class', authenticate, requireStudent, async (req, res) => {
  try {
    // user is a student

    const { page = 1, limit = 10, certificateType } = req.query;

    const certificates = await Certificate.getClassFeed(
      req.user.department,
      req.user.year,
      req.user.section,
      parseInt(page),
      parseInt(limit),
      certificateType
    );

  res.json({
    success: true,
      data: certificates
    });

  } catch (error) {
    console.error('Class feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class feed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/certificates/types
// @desc    Get available certificate types
// @access  Private
router.get('/types', authenticate, async (req, res) => {
  try {
    const certificateTypes = [
      'Participation', 'Achievement', 'Recognition', 'Workshop',
      'Award', 'Appreciation', 'Internship', 'Extra-curricular',
      'Course Completion', 'Certification', 'Project', 'Competition',
      'Leadership', 'Volunteer', 'Research', 'Publication',
      'Training', 'Conference', 'Seminar', 'Bootcamp',
      'Hackathon', 'Scholarship', 'Honor', 'Distinction',
      'Merit', 'Excellence', 'Innovation', 'Creativity',
      'Teamwork', 'Communication', 'Problem Solving', 'Critical Thinking',
      'Mentorship', 'Community Service', 'Social Impact', 'Environmental',
      'Cultural', 'Sports', 'Arts', 'Music',
      'Drama', 'Debate', 'Public Speaking', 'Writing',
      'Photography', 'Design', 'Technology', 'Programming',
      'Data Science', 'AI/ML', 'Cybersecurity', 'Cloud Computing',
      'Mobile Development', 'Web Development', 'Game Development',
      'Blockchain', 'IoT', 'Robotics', 'Other'
    ];

    res.json({
      success: true,
      data: certificateTypes
    });

  } catch (error) {
    console.error('Get certificate types error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching certificate types',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/certificates/categories
// @desc    Get available certificate categories
// @access  Private
router.get('/categories', authenticate, async (req, res) => {
  try {
    const categories = [
      'technical',
      'non-technical',
      'academic',
      'extracurricular',
      'professional',
      'research'
    ];

  res.json({
    success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get certificate categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching certificate categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/certificates/:id/like
// @desc    Like a certificate
// @access  Private (Student only)
router.post('/:id/like', authenticate, requireStudent, async (req, res) => {
  try {
    const certificate = await Certificate.likeCertificate(req.params.id, req.user._id);
    
    res.json({
      success: true,
      message: 'Certificate liked successfully',
      data: {
        certificateId: certificate._id,
        likesCount: certificate.likesCount,
        isLiked: true
      }
    });
  } catch (error) {
    console.error('Like certificate error:', error);
    if (error.message === 'Certificate not found') {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }
    if (error.message === 'Certificate already liked') {
      return res.status(400).json({
        success: false,
        message: 'Certificate already liked'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while liking certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/certificates/:id/like
// @desc    Unlike a certificate
// @access  Private (Student only)
router.delete('/:id/like', authenticate, requireStudent, async (req, res) => {
  try {
    const certificate = await Certificate.unlikeCertificate(req.params.id, req.user._id);
    
    res.json({
      success: true,
      message: 'Certificate unliked successfully',
      data: {
        certificateId: certificate._id,
        likesCount: certificate.likesCount,
        isLiked: false
      }
    });
  } catch (error) {
    console.error('Unlike certificate error:', error);
    if (error.message === 'Certificate not found') {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while unliking certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/certificates/:id/comment
// @desc    Add a comment to a certificate
// @access  Private (Student only)
router.post('/:id/comment', authenticate, requireStudent, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }
    
    const certificate = await Certificate.addComment(req.params.id, req.user._id, text.trim());
    
    res.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        certificateId: certificate._id,
        commentsCount: certificate.commentsCount
      }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    if (error.message === 'Certificate not found') {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while adding comment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/certificates/:id
// @desc    Get a single certificate by ID (for sharing)
// @access  Public (for sharing purposes)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid certificate ID format'
      });
    }

    const certificate = await Certificate.aggregate([
      {
        $match: {
          _id: require('mongoose').Types.ObjectId(id),
          status: 'approved' // Only show approved certificates for public sharing
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                name: { $concat: ['$firstName', ' ', '$lastName'] },
                profilePicture: 1,
                'profile.picture': 1,
                department: 1,
                section: 1,
                academicYear: 1
              }
            }
          ]
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'likes',
          foreignField: '_id',
          as: 'likedBy',
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                name: { $concat: ['$firstName', ' ', '$lastName'] },
                profilePicture: 1
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'comments.user',
          foreignField: '_id',
          as: 'commentUsers',
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                name: { $concat: ['$firstName', ' ', '$lastName'] },
                profilePicture: 1
              }
            }
          ]
        }
      },
      {
        $addFields: {
          likesCount: { $size: '$likes' },
          commentsCount: { $size: '$comments' },
          comments: {
            $map: {
              input: '$comments',
              as: 'comment',
              in: {
                _id: '$$comment._id',
                text: '$$comment.text',
                createdAt: '$$comment.createdAt',
                user: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$commentUsers',
                        cond: { $eq: ['$$this._id', '$$comment.user'] }
                      }
                    },
                    0
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          commentUsers: 0
        }
      }
    ]);

    if (!certificate || certificate.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or not approved for public viewing'
      });
    }

    res.json({
      success: true,
      data: {
        certificates: certificate
      }
    });

  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching certificate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;