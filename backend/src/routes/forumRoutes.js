const express = require('express');
const router = express.Router();

const forumController = require('../controllers/forumController');
const { protect, optionalAuth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');
const { validate, idValidation, paginationValidation, forumPostValidation } = require('../middleware/validation');
const { forumLimiter } = require('../middleware/rateLimiter');

/**
 * @route   GET /api/forum/posts
 * @desc    Get forum posts (approved only)
 * @access  Public
 */
router.get('/posts', paginationValidation, validate, forumController.getPosts);

/**
 * @route   GET /api/forum/trending
 * @desc    Get trending posts
 * @access  Public
 */
router.get('/trending', forumController.getTrendingPosts);

/**
 * @route   GET /api/forum/categories
 * @desc    Get forum categories
 * @access  Public
 */
router.get('/categories', forumController.getCategories);

/**
 * @route   GET /api/forum/search
 * @desc    Search forum posts
 * @access  Public
 */
router.get('/search', forumController.searchPosts);

/**
 * @route   POST /api/forum/posts
 * @desc    Create forum post
 * @access  Private
 */
router.post('/posts', protect, forumLimiter, forumPostValidation, validate, forumController.createPost);

/**
 * @route   GET /api/forum/posts/:id
 * @desc    Get forum post by ID
 * @access  Public
 */
router.get('/posts/:id', optionalAuth, idValidation, validate, forumController.getPostById);

/**
 * @route   PATCH /api/forum/posts/:id
 * @desc    Update forum post
 * @access  Private
 */
router.patch('/posts/:id', protect, idValidation, validate, forumController.updatePost);

/**
 * @route   DELETE /api/forum/posts/:id
 * @desc    Delete forum post
 * @access  Private
 */
router.delete('/posts/:id', protect, idValidation, validate, forumController.deletePost);

/**
 * @route   POST /api/forum/posts/:id/comments
 * @desc    Add comment to post
 * @access  Private
 */
router.post('/posts/:id/comments', protect, idValidation, validate, forumController.addComment);

/**
 * @route   POST /api/forum/posts/:id/like
 * @desc    Like/unlike post
 * @access  Private
 */
router.post('/posts/:id/like', protect, idValidation, validate, forumController.likePost);

/**
 * @route   POST /api/forum/posts/:id/flag
 * @desc    Flag post for moderation
 * @access  Private
 */
router.post('/posts/:id/flag', protect, idValidation, validate, forumController.flagPost);

/**
 * @route   GET /api/forum/user/:userId/posts
 * @desc    Get user's forum posts
 * @access  Public
 */
router.get('/user/:userId/posts', idValidation, validate, paginationValidation, forumController.getUserPosts);

/**
 * @route   GET /api/forum/pending (Admin only)
 * @desc    Get posts pending moderation
 * @access  Private (Admin only)
 */
router.get('/pending', protect, isAdmin, forumController.getPendingPosts);

/**
 * @route   GET /api/forum/flagged (Admin only)
 * @desc    Get flagged posts
 * @access  Private (Admin only)
 */
router.get('/flagged', protect, isAdmin, forumController.getFlaggedPosts);

/**
 * @route   POST /api/forum/moderate/:id (Admin only)
 * @desc    Moderate forum post
 * @access  Private (Admin only)
 */
router.post('/moderate/:id', protect, isAdmin, idValidation, validate, forumController.moderatePost);

module.exports = router;