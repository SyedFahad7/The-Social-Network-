const express = require('express');
const router = express.Router();
const Section = require('../models/Section');
const auth = require('../middleware/auth');
const { isTeacher, isSuperAdmin } = require('../middleware/roleCheck');

// Get all sections (filtered by department for non-super-admin)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // If not super admin, filter by department
    if (req.user.role !== 'super-admin') {
      query.departmentId = req.user.department;
    }
    
    const sections = await Section.find(query)
      .populate('teacherId', 'firstName lastName email')
      .populate('departmentId', 'name code');
    
    res.json({
      success: true,
      data: { sections }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sections',
      error: error.message
    });
  }
});

// Get sections by teacher
router.get('/teacher/:teacherId', auth, async (req, res) => {
  try {
    const sections = await Section.find({ teacherId: req.params.teacherId })
      .populate('departmentId', 'name code');
    
    res.json({
      success: true,
      data: { sections }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher sections',
      error: error.message
    });
  }
});

// Get section by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate('teacherId', 'firstName lastName email')
      .populate('departmentId', 'name code');
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    res.json({
      success: true,
      data: { section }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching section',
      error: error.message
    });
  }
});

// Create new section (super admin only)
router.post('/', auth, isSuperAdmin, async (req, res) => {
  try {
    const section = new Section(req.body);
    await section.save();
    
    const populatedSection = await Section.findById(section._id)
      .populate('teacherId', 'firstName lastName email')
      .populate('departmentId', 'name code');
    
    res.status(201).json({
      success: true,
      data: { section: populatedSection }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating section',
      error: error.message
    });
  }
});

// Update section (super admin only)
router.put('/:id', auth, isSuperAdmin, async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('teacherId', 'firstName lastName email')
     .populate('departmentId', 'name code');
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    res.json({
      success: true,
      data: { section }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating section',
      error: error.message
    });
  }
});

// Delete section (super admin only)
router.delete('/:id', auth, isSuperAdmin, async (req, res) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting section',
      error: error.message
    });
  }
});

module.exports = router; 