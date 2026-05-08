/**
 * Forum Controller
 * Handles forum posts, comments, moderation, and flagging
 * With strict moderation for legal discussions
 */

const ForumPost = require('../models/ForumPost');
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const { FORUM_CATEGORIES, FORUM_MODERATION_STATUS, FLAG_REASONS, HTTP_STATUS } = require('../config/constants');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Get forum posts (approved only for public)
 * @route GET /api/forum/posts
 * @access Public
 */
exports.getPosts = catchAsync(async (req, res, next) => {
    const { category, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const posts = await ForumPost.findApproved(category, limit, (page - 1) * limit);

    const total = await ForumPost.countDocuments({
        moderationStatus: 'APPROVED',
        isDeleted: false,
        ...(category && { category })
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get forum post by ID
 * @route GET /api/forum/posts/:id
 * @access Public
 */
exports.getPostById = catchAsync(async (req, res, next) => {
    const post = await ForumPost.findById(req.params.id)
        .populate('authorId', 'fullName userType profilePicture')
        .populate('comments.authorId', 'fullName userType');

    if (!post || post.isDeleted) {
        return next(new AppError('Post not found', HTTP_STATUS.NOT_FOUND));
    }

    // Only show approved posts to public
    if (post.moderationStatus !== 'APPROVED' && req.user?.userType !== 'ADMIN') {
        return next(new AppError('Post is not available', HTTP_STATUS.NOT_FOUND));
    }

    // Increment view count
    post.views += 1;
    await post.save();

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { post }
    });
});

/**
 * Create forum post
 * @route POST /api/forum/posts
 * @access Private
 */
exports.createPost = catchAsync(async (req, res, next) => {
    const { title, content, category, tags } = req.body;

    // Check for inappropriate content (simplified - would integrate with AI service)
    const containsRestricted = await checkRestrictedContent(content);

    const post = await ForumPost.create({
        authorId: req.user._id,
        authorName: req.user.fullName,
        authorType: req.user.userType,
        title,
        content,
        category,
        tags,
        moderationStatus: containsRestricted ? 'FLAGGED' : 'PENDING',
        containsRestrictedContent: containsRestricted
    });

    // Log creation
    await SystemLog.log({
        userId: req.user._id,
        action: 'FORUM_POST_CREATED',
        module: 'FORUM',
        severity: 'INFO',
        details: { postId: post._id, category }
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Post created successfully and pending moderation',
        data: { post }
    });
});

/**
 * Update forum post
 * @route PATCH /api/forum/posts/:id
 * @access Private
 */
exports.updatePost = catchAsync(async (req, res, next) => {
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
        return next(new AppError('Post not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check ownership
    if (post.authorId.toString() !== req.user._id.toString() && req.user.userType !== 'ADMIN') {
        return next(new AppError('You can only edit your own posts', HTTP_STATUS.FORBIDDEN));
    }

    // Can't edit moderated posts
    if (post.moderationStatus !== 'PENDING' && req.user.userType !== 'ADMIN') {
        return next(new AppError('This post cannot be edited after moderation', HTTP_STATUS.FORBIDDEN));
    }

    const allowedFields = ['title', 'content', 'tags'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            post[field] = req.body[field];
        }
    });

    post.updatedAt = Date.now();
    await post.save();

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Post updated successfully',
        data: { post }
    });
});

/**
 * Delete forum post
 * @route DELETE /api/forum/posts/:id
 * @access Private
 */
exports.deletePost = catchAsync(async (req, res, next) => {
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
        return next(new AppError('Post not found', HTTP_STATUS.NOT_FOUND));
    }

    // Check ownership or admin
    if (post.authorId.toString() !== req.user._id.toString() && req.user.userType !== 'ADMIN') {
        return next(new AppError('You can only delete your own posts', HTTP_STATUS.FORBIDDEN));
    }

    post.isDeleted = true;
    await post.save();

    // Log deletion
    await SystemLog.log({
        userId: req.user._id,
        action: 'FORUM_POST_DELETED',
        module: 'FORUM',
        severity: 'INFO',
        details: { postId: post._id }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Post deleted successfully'
    });
});

/**
 * Add comment to post
 * @route POST /api/forum/posts/:id/comments
 * @access Private
 */
exports.addComment = catchAsync(async (req, res, next) => {
    const { content } = req.body;

    const post = await ForumPost.findById(req.params.id);

    if (!post) {
        return next(new AppError('Post not found', HTTP_STATUS.NOT_FOUND));
    }

    // Can only comment on approved posts
    if (post.moderationStatus !== 'APPROVED') {
        return next(new AppError('Cannot comment on unapproved posts', HTTP_STATUS.FORBIDDEN));
    }

    // Check for inappropriate content
    const containsRestricted = await checkRestrictedContent(content);

    const comment = await post.addComment({
        authorId: req.user._id,
        authorName: req.user.fullName,
        authorType: req.user.userType,
        content,
        moderationStatus: containsRestricted ? 'FLAGGED' : 'PENDING'
    });

    // Notify post author
    if (post.authorId.toString() !== req.user._id.toString()) {
        await Notification.create({
            userId: post.authorId,
            type: 'FORUM_COMMENT_REPLY',
            title: 'New Comment on Your Post',
            message: `${req.user.fullName} commented on your post: ${post.title}`,
            data: { postId: post._id }
        });
    }

    res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Comment added successfully',
        data: { comment }
    });
});

/**
 * Like/unlike post
 * @route POST /api/forum/posts/:id/like
 * @access Private
 */
exports.likePost = catchAsync(async (req, res, next) => {
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
        return next(new AppError('Post not found', HTTP_STATUS.NOT_FOUND));
    }

    await post.like(req.user._id);

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { likes: post.likeCount }
    });
});

/**
 * Flag post for moderation
 * @route POST /api/forum/posts/:id/flag
 * @access Private
 */
exports.flagPost = catchAsync(async (req, res, next) => {
    const { reason, comment } = req.body;

    const post = await ForumPost.findById(req.params.id);

    if (!post) {
        return next(new AppError('Post not found', HTTP_STATUS.NOT_FOUND));
    }

    // Can't flag own post
    if (post.authorId.toString() === req.user._id.toString()) {
        return next(new AppError('You cannot flag your own post', HTTP_STATUS.FORBIDDEN));
    }

    await post.flag(req.user._id, reason, comment);

    // Log flag
    await SystemLog.log({
        userId: req.user._id,
        action: 'FORUM_POST_FLAGGED',
        module: 'FORUM',
        severity: 'WARNING',
        details: { postId: post._id, reason }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'Post flagged for moderation'
    });
});

/**
 * Get forum categories
 * @route GET /api/forum/categories
 * @access Public
 */
exports.getCategories = catchAsync(async (req, res, next) => {
    const categories = Object.keys(FORUM_CATEGORIES).map(key => ({
        value: FORUM_CATEGORIES[key],
        label: FORUM_CATEGORIES[key].replace(/_/g, ' ')
    }));

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { categories }
    });
});

/**
 * Get trending posts
 * @route GET /api/forum/trending
 * @access Public
 */
exports.getTrendingPosts = catchAsync(async (req, res, next) => {
    const posts = await ForumPost.find({
        moderationStatus: 'APPROVED',
        isDeleted: false,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
        .sort({ views: -1, likeCount: -1, commentCount: -1 })
        .limit(5)
        .populate('authorId', 'fullName');

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: { posts }
    });
});

/**
 * Search forum posts
 * @route GET /api/forum/search
 * @access Public
 */
exports.searchPosts = catchAsync(async (req, res, next) => {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
        return next(new AppError('Search query required', HTTP_STATUS.BAD_REQUEST));
    }

    const posts = await ForumPost.find({
        moderationStatus: 'APPROVED',
        isDeleted: false,
        $or: [
            { title: { $regex: q, $options: 'i' } },
            { content: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } }
        ]
    })
        .populate('authorId', 'fullName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await ForumPost.countDocuments({
        moderationStatus: 'APPROVED',
        isDeleted: false,
        $or: [
            { title: { $regex: q, $options: 'i' } },
            { content: { $regex: q, $options: 'i' } }
        ]
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get user's forum posts
 * @route GET /api/forum/user/:userId/posts
 * @access Public
 */
exports.getUserPosts = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;

    const posts = await ForumPost.find({
        authorId: req.params.userId,
        moderationStatus: 'APPROVED',
        isDeleted: false
    })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('authorId', 'fullName');

    const total = await ForumPost.countDocuments({
        authorId: req.params.userId,
        moderationStatus: 'APPROVED',
        isDeleted: false
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get posts pending moderation
 * @route GET /api/forum/pending
 * @access Private (Admin only)
 */
exports.getPendingPosts = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;

    const posts = await ForumPost.find({ moderationStatus: 'PENDING', isDeleted: false })
        .populate('authorId', 'fullName userType profilePicture')
        .sort({ createdAt: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await ForumPost.countDocuments({ moderationStatus: 'PENDING', isDeleted: false });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get flagged posts
 * @route GET /api/forum/flagged
 * @access Private (Admin only)
 */
exports.getFlaggedPosts = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;

    const posts = await ForumPost.find({ moderationStatus: 'FLAGGED', isDeleted: false })
        .populate('authorId', 'fullName userType profilePicture')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await ForumPost.countDocuments({ moderationStatus: 'FLAGGED', isDeleted: false });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: {
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Moderate forum post
 * @route POST /api/forum/moderate/:id
 * @access Private (Admin only)
 */
exports.moderatePost = catchAsync(async (req, res, next) => {
    const { status, moderationNote } = req.body;
    
    if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
        return next(new AppError('Invalid moderation status', HTTP_STATUS.BAD_REQUEST));
    }

    const post = await ForumPost.findById(req.params.id);

    if (!post) {
        return next(new AppError('Post not found', HTTP_STATUS.NOT_FOUND));
    }

    post.moderationStatus = status;
    if (moderationNote) post.moderationNote = moderationNote;
    post.updatedAt = Date.now();

    await post.save();

    // Log moderation action
    await SystemLog.log({
        userId: req.user._id,
        action: 'FORUM_POST_MODERATED',
        module: 'FORUM',
        severity: 'INFO',
        details: { postId: post._id, newStatus: status }
    });

    res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: `Post ${status.toLowerCase()} successfully`,
        data: { post }
    });
});

/**
 * Helper function to check restricted content
 * Would integrate with AI service in production
 */
async function checkRestrictedContent(text) {
    const restrictedPatterns = [
        /harassment/i,
        /hate speech/i,
        /violence/i,
        /discrimination/i,
        /obscene/i
    ];

    return restrictedPatterns.some(pattern => pattern.test(text));
}

module.exports = exports;