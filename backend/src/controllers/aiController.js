/**
 * AI Controller
 * Handles AI-powered legal guidance, document analysis, and jurisdiction detection
 * Integrates with Python AI service
 */

const AIResponse = require('../models/AIResponse');
const SystemLog = require('../models/SystemLog');
const { HTTP_STATUS, DISCLAIMER } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const aiService = require('../services/aiService');

/**
 * Get AI legal guidance
 * @route POST /api/ai/guidance
 * @access Private
 */
exports.getLegalGuidance = catchAsync(async (req, res, next) => {
    const { query } = req.body;

    if (!query) {
        return next(new AppError('Query is required', HTTP_STATUS.BAD_REQUEST));
    }

    // Delegate all logic (processing, persona enforcement, and persistence) to the AI Service
    const aiResponseDoc = await aiService.processLegalQuery(query, req.user, req);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            response: aiResponseDoc.response,
            jurisdiction: aiResponseDoc.jurisdictionDetected,
            disclaimer: aiResponseDoc.queryLanguage === 'Amharic' ? DISCLAIMER.am : DISCLAIMER.en,
            warning: aiResponseDoc.requiresWarning ? {
                type: aiResponseDoc.warningType,
                message: aiResponseDoc.warningMessage || "Warning triggered."
            } : null
        }
    });
});

/**
 * Analyze legal document
 * @route POST /api/ai/analyze-document
 * @access Private
 */
exports.analyzeDocument = catchAsync(async (req, res, next) => {
    const { documentText } = req.body;

    if (!documentText) {
        return next(new AppError('Document text is required', HTTP_STATUS.BAD_REQUEST));
    }

    // Process via specialized AI service method
    const aiResponseDoc = await aiService.analyzeDocument(documentText, req.user);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: aiResponseDoc
    });
});

/**
 * Detect jurisdiction
 * @route POST /api/ai/detect-jurisdiction
 * @access Private
 */
exports.detectJurisdiction = catchAsync(async (req, res, next) => {
    const { query } = req.body;

    if (!query) {
        return next(new AppError('Query is required', HTTP_STATUS.BAD_REQUEST));
    }

    const { jurisdictionDetected, foreignJurisdictions } = await aiService.analyzeJurisdiction(query);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            jurisdiction: jurisdictionDetected,
            details: foreignJurisdictions
        }
    });
});

/**
 * Get legal FAQs
 * @route GET /api/ai/faq
 * @access Public
 */
exports.getFAQ = catchAsync(async (req, res, next) => {
    const { category } = req.query;

    const faqs = {
        family_law: [
            {
                question: "What are the grounds for divorce in Ethiopia?",
                answer: "Under the Ethiopian Family Code, grounds for divorce include: mutual consent, irreconcilable differences, adultery, desertion for more than 2 years, and cruel treatment.",
                category: "family_law"
            },
            {
                question: "How is child custody determined?",
                answer: "Child custody is determined based on the best interest of the child. The court considers factors such as age of the child, parents' ability to care, and the child's preference if over 14 years old."
            }
        ],
        criminal_law: [
            {
                question: "What are the rights of an accused person in Ethiopia?",
                answer: "An accused person has the right to be informed of the charges, right to legal counsel, right to remain silent, right to a fair trial, and right to appeal."
            },
            {
                question: "What is the statute of limitations for crimes?",
                answer: "The statute of limitations varies by crime: 25 years for serious crimes, 15 years for crimes punishable by 10+ years, 8 years for lesser crimes, and 3 years for minor offenses."
            }
        ],
        labor_law: [
            {
                question: "What are the grounds for termination of employment?",
                answer: "Under Labour Proclamation 1156/2019, employment can be terminated for: mutual agreement, expiry of contract, serious misconduct, redundancy, or inability to perform duties."
            },
            {
                question: "What are the rights to severance pay?",
                answer: "Employees who have worked for at least one year are entitled to severance pay upon termination without cause, ranging from 30 to 90 days' wages based on years of service."
            }
        ]
    };

    if (category && faqs[category]) {
        return res.status(HTTP_STATUS.OK).json({
            status: 'success',
            data: { faqs: faqs[category] }
        });
    }

    const allFaqs = Object.values(faqs).flat();
    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { faqs: allFaqs }
    });
});

/**
 * Get AI usage statistics for user
 * @route GET /api/ai/stats
 * @access Private
 */
exports.getAIStats = catchAsync(async (req, res, next) => {
    const stats = await AIResponse.aggregate([
        { $match: { userId: req.user._id } },
        {
            $group: {
                _id: {
                    jurisdiction: '$jurisdictionDetected',
                    month: { $month: '$createdAt' }
                },
                count: { $sum: 1 },
                avgConfidence: { $avg: '$confidence' }
            }
        },
        { $sort: { '_id.month': -1 } }
    ]);

    const totalQueries = await AIResponse.countDocuments({ userId: req.user._id });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            totalQueries,
            breakdown: stats
        }
    });
});

/**
 * Translate legal text
 * @route POST /api/ai/translate
 * @access Private
 */
exports.translateText = catchAsync(async (req, res, next) => {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
        return next(new AppError('Text and target language are required', HTTP_STATUS.BAD_REQUEST));
    }

    // Built-in detection for simple translation mapping
    const translations = {
        'እንኳን ደህና መጡ': 'Welcome',
        'የህግ ምክር': 'Legal Advice',
        'ቀጠሮ': 'Appointment'
    };

    const translated = translations[text] || text;

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            original: text,
            translated,
            targetLanguage
        }
    });
});

module.exports = exports;
