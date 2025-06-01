const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const replyHandlerService = require('../services/replyHandlerService');

// @route   POST /api/replies/process-all
// @desc    Manually trigger processing of replies for all users
// @access  Private (e.g., Admin or a specific service role)
router.post('/process-all', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    console.log(`API call to /api/replies/process-all received from user ${req.user.id}`);
    // No need to await if we want to send an immediate response that processing has started.
    // For now, let's await to get the result for immediate feedback.
    const result = await replyHandlerService.checkAndProcessRepliesForAllUsers();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Reply processing cycle completed.',
        data: {
          processedUserCount: result.processedCount,
          errorCount: result.errorCount,
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Reply processing failed or is already in progress.',
        data: {
          processedUserCount: result.processedCount,
          errorCount: result.errorCount,
        }
      });
    }
  } catch (error) {
    console.error('[API /replies/process-all] Error triggering reply processing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while trying to process replies.',
      error: error.message
    });
  }
});

module.exports = router; 