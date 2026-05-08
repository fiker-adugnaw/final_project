const express = require('express');
const router = express.Router();

const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { validate, aiGuidanceValidation } = require('../middleware/validation');
const { aiLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/ai/guidance
 * @desc    Get AI legal guidance
 * @access  Private
 */
router.post('/guidance', protect, aiLimiter, aiGuidanceValidation, validate, aiController.getLegalGuidance);

/**
 * @route   POST /api/ai/analyze-document
 * @desc    Analyze legal document
 * @access  Private
 */
router.post('/analyze-document', protect, aiLimiter, aiController.analyzeDocument);

/**
 * @route   POST /api/ai/detect-jurisdiction
 * @desc    Detect jurisdiction of query
 * @access  Private
 */
router.post('/detect-jurisdiction', protect, aiController.detectJurisdiction);

/**
 * @route   GET /api/ai/faq
 * @desc    Get legal FAQs
 * @access  Public
 */
router.get('/faq', aiController.getFAQ);

/**
 * @route   GET /api/ai/stats
 * @desc    Get AI usage statistics for user
 * @access  Private
 */
router.get('/stats', protect, aiController.getAIStats);

/**
 * @route   POST /api/ai/translate
 * @desc    Translate legal text
 * @access  Private
 */
router.post('/translate', protect, aiController.translateText);

module.exports = router;