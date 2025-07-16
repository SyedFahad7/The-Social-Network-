const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Feedback, FeedbackResponse } = require('../models/Feedback');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/feedback
// @desc    Get feedback forms
// @access  Private
router.get('/', [
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['draft', 'active', 'closed', 'archived'])
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  let query = {};
  
  // Filter based on user role
  if (req.user.role === 'student') {
    // Students only see active feedback forms they can respond to
    const activeFeedbacks = await Feedback.getActiveForUser(req.user);
    return res.json({
      success: true,
      data: {
        feedbacks: activeFeedbacks,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalFeedbacks: activeFeedbacks.length,
          limit: activeFeedbacks.length
        }
      }
    });
  } else if (req.user.role === 'teacher') {
    // Teachers can see feedback forms they created
    query.createdBy = req.user._id;
  }
  
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [feedbacks, total] = await Promise.all([
    Feedback.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Feedback.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      feedbacks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalFeedbacks: total,
        limit: parseInt(limit)
      }
    }
  });
}));

// @route   POST /api/feedback
// @desc    Create feedback form
// @access  Private (Super Admin only)
router.post('/', [
  authenticate,
  requireSuperAdmin,
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('feedbackType').isIn(['teacher-evaluation', 'course-feedback', 'general-feedback', 'suggestion']).withMessage('Valid feedback type is required'),
  body('targetRole').isIn(['student', 'teacher', 'all']).withMessage('Valid target role is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
  body('questions.*.questionText').trim().isLength({ min: 1, max: 500 }).withMessage('Question text is required'),
  body('questions.*.questionType').isIn(['multiple-choice', 'rating', 'text', 'yes-no']).withMessage('Valid question type is required'),
  body('questions.*.order').isInt({ min: 1 }).withMessage('Valid question order is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const feedbackData = {
    ...req.body,
    createdBy: req.user._id
  };

  // Validate dates
  if (new Date(feedbackData.endDate) <= new Date(feedbackData.startDate)) {
    return res.status(400).json({
      success: false,
      message: 'End date must be after start date'
    });
  }

  const feedback = new Feedback(feedbackData);
  await feedback.save();

  await feedback.populate('createdBy', 'firstName lastName email');

  res.status(201).json({
    success: true,
    message: 'Feedback form created successfully',
    data: { feedback }
  });
}));

// @route   POST /api/feedback/:id/response
// @desc    Submit feedback response
// @access  Private (Student only)
router.post('/:id/response', [
  authenticate,
  body('answers').isArray({ min: 1 }).withMessage('At least one answer is required'),
  body('answers.*.questionId').isMongoId().withMessage('Valid question ID is required'),
  body('answers.*.answer').notEmpty().withMessage('Answer is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback form not found'
    });
  }

  // Check if feedback is currently active
  if (!feedback.isCurrentlyActive) {
    return res.status(400).json({
      success: false,
      message: 'Feedback form is not currently active'
    });
  }

  // Check if user has already responded
  const existingResponse = await FeedbackResponse.findOne({
    feedback: feedback._id,
    respondent: req.user._id
  });

  if (existingResponse && !feedback.allowMultipleSubmissions) {
    return res.status(400).json({
      success: false,
      message: 'You have already submitted a response to this feedback'
    });
  }

  const { answers } = req.body;

  // Validate all required questions are answered
  const requiredQuestions = feedback.questions.filter(q => q.isRequired);
  const answeredQuestionIds = answers.map(a => a.questionId.toString());
  
  for (const question of requiredQuestions) {
    if (!answeredQuestionIds.includes(question._id.toString())) {
      return res.status(400).json({
        success: false,
        message: `Question "${question.questionText}" is required`
      });
    }
  }

  const response = new FeedbackResponse({
    feedback: feedback._id,
    respondent: req.user._id,
    answers,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  await response.save();

  // Update feedback response count
  feedback.totalResponses += 1;
  await feedback.save();

  res.status(201).json({
    success: true,
    message: 'Feedback response submitted successfully',
    data: { response }
  });
}));

// @route   GET /api/feedback/:id/responses
// @desc    Get feedback responses
// @access  Private (Super Admin only)
router.get('/:id/responses', [
  authenticate,
  requireSuperAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50
  } = req.query;

  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback form not found'
    });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [responses, total] = await Promise.all([
    FeedbackResponse.find({ feedback: feedback._id })
      .populate('respondent', 'firstName lastName rollNumber section department')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    FeedbackResponse.countDocuments({ feedback: feedback._id })
  ]);

  res.json({
    success: true,
    data: {
      feedback,
      responses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalResponses: total,
        limit: parseInt(limit)
      }
    }
  });
}));

// @route   PUT /api/feedback/:id/activate
// @desc    Activate feedback form
// @access  Private (Super Admin only)
router.put('/:id/activate', [
  authenticate,
  requireSuperAdmin
], asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback form not found'
    });
  }

  if (feedback.status !== 'draft') {
    return res.status(400).json({
      success: false,
      message: 'Only draft feedback forms can be activated'
    });
  }

  await feedback.activate();

  res.json({
    success: true,
    message: 'Feedback form activated successfully',
    data: { feedback }
  });
}));

module.exports = router;