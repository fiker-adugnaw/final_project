const mongoose = require('mongoose');

/**
 * AI Response Schema - Stores all AI interactions for audit
 */
const aiResponseSchema = new mongoose.Schema({
    responseId: {
        type: String,
        unique: true,
        default: function () {
            return 'AI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        }
    },

    // User information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Query details
    query: {
        type: String,
        required: [true, 'Query is required'],
        maxlength: [5000, 'Query cannot exceed 5000 characters']
    },

    queryLanguage: {
        type: String,
        enum: ['Amharic', 'English'],
        required: true
    },

    // Response
    response: {
        type: String,
        required: true
    },

    responseLanguage: {
        type: String,
        enum: ['Amharic', 'English'],
        required: true
    },

    // CRITICAL: Jurisdiction filtering
    jurisdictionDetected: {
        type: String,
        enum: ['ETHIOPIAN', 'FOREIGN', 'MIXED', 'UNKNOWN'],
        default: 'UNKNOWN'
    },

    foreignJurisdictions: [{
        country: String,
        constitution: String,
        relevance: {
            type: String,
            enum: ['PRIMARY', 'SECONDARY', 'MENTIONED']
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1
        }
    }],

    // Ethiopian legal references
    ethiopianLegalReferences: [{
        lawType: {
            type: String,
            enum: ['CONSTITUTION', 'PROCLAMATION', 'REGULATION', 'COURT_DECISION', 'CODE']
        },
        reference: String,
        article: String,
        section: String,
        relevance: String,
        confidence: {
            type: Number,
            min: 0,
            max: 1
        }
    }],

    // AI metadata
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
    },

    modelUsed: {
        type: String,
        default: 'ethiopian-legal-ai-v1'
    },

    processingTime: Number, // in milliseconds

    // Filtering results
    isLegalQuery: {
        type: Boolean,
        default: true
    },

    filterReason: String,

    filteredTerms: [String],

    // Warning flags
    requiresWarning: {
        type: Boolean,
        default: false
    },

    warningType: {
        type: String,
        enum: ['FOREIGN_JURISDICTION', 'NON_LEGAL', 'AMBIGUOUS', 'SENSITIVE']
    },

    warningMessage: String,

    // Disclaimer (required for all responses)
    disclaimer: {
        type: String,
        default: "This is general legal information only and does not constitute legal advice. For specific legal advice, please consult a verified lawyer."
    },

    disclaimerAmharic: {
        type: String,
        default: "ይህ አጠቃላይ የህግ መረጃ ብቻ ነው እንጂ የህግ ምክር አይደለም። ለተወሰነ የህግ ምክር እባክዎን የተረጋገጠ ጠበቃ ያማክሩ።"
    },

    // User feedback
    userRating: {
        type: Number,
        min: 1,
        max: 5
    },

    userFeedback: String,

    // Metadata
    ipAddress: String,
    userAgent: String,

    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    }
});

// Pre-save middleware to set disclaimer based on language
aiResponseSchema.pre('save', async function () {
    if (this.responseLanguage === 'Amharic') {
        this.disclaimer = this.disclaimerAmharic;
    }
});

// Static method to find queries by jurisdiction
aiResponseSchema.statics.findByJurisdiction = function (jurisdiction, startDate, endDate) {
    const query = { jurisdictionDetected: jurisdiction };

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
    }

    return this.find(query).populate('userId', 'email userType').sort({ createdAt: -1 });
};

// Static method to get jurisdiction statistics
aiResponseSchema.statics.getJurisdictionStats = function () {
    return this.aggregate([
        {
            $group: {
                _id: '$jurisdictionDetected',
                count: { $sum: 1 },
                avgConfidence: { $avg: '$confidence' }
            }
        }
    ]);
};

// Indexes

aiResponseSchema.index({ userId: 1, createdAt: -1 });
aiResponseSchema.index({ jurisdictionDetected: 1 });
aiResponseSchema.index({ createdAt: -1 });
aiResponseSchema.index({ query: 'text' });

const AIResponse = mongoose.model('AIResponse', aiResponseSchema);

module.exports = AIResponse;
