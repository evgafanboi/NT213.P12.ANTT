const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { renderAndSanitizeMarkdown } = require('../utils/markdown');
const rateLimit = require('express-rate-limit');

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

const WINDOWMS = 900000; // 15 minutes in milliseconds

const rateLimiter = rateLimit({
  windowMs: WINDOWMS, // 15 minutes
  max: 30 // limit each IP to 30 requests per windowMs
});

const strictRateLimiter = rateLimit({
  windowMs: WINDOWMS, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers  
});

// Create a new comment
router.post('/', strictRateLimiter, [
  body('post_id').isInt(),
  body('content').isLength({ min: 1 }).trim(),
], checkAuth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { post_id, content } = req.body;

  try {
    const result = await db.run(
      'INSERT INTO comments (email, post_id, content) VALUES (?, ?, ?)',
      [req.session.userId, post_id, content]
    );
    res.status(201).json({ id: result.id, message: 'Comment created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for a specific post with pagination
router.get('/post/:postId', rateLimiter, async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const comments = await db.all(`
      SELECT 
        c.*,
        u.username as author_name
      FROM comments c
      LEFT JOIN users u ON c.email = u.email
      WHERE c.post_id = ? 
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.params.postId, limit, offset]);
    
    // Render markdown for each comment
    const renderedComments = comments.map(comment => ({
      ...comment,
      content: renderAndSanitizeMarkdown(comment.content)
    }));
    
    res.json(renderedComments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a comment
router.put('/:id', strictRateLimiter, [
  body('content').isLength({ min: 1 }).trim(),
], checkAuth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content } = req.body;

  try {
    const comment = await db.get('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.email !== req.session.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.run('UPDATE comments SET content = ? WHERE id = ?', [content, req.params.id]);
    res.json({ message: 'Comment updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment
router.delete('/:id', checkAuth, rateLimiter, async (req, res) => {
  try {
    const comment = await db.get('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.email !== req.session.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.run('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments by user, raw
router.get('/user', rateLimiter, checkAuth, async (req, res) => {
    try {
        const comments = await db.all(`
            SELECT 
                c.*,
                p.title as post_title,
                u.username as author_name
            FROM comments c
            LEFT JOIN posts p ON c.post_id = p.id
            LEFT JOIN users u ON c.email = u.email
            WHERE c.email = ?
            ORDER BY c.created_at DESC
        `, [req.session.userId]);
        
        // Send both raw and rendered content
        const commentsWithBoth = comments.map(comment => ({
            ...comment,
            raw_content: comment.content, // Keep original markdown
            content: renderAndSanitizeMarkdown(comment.content) // Add rendered version
        }));
        
        res.json(commentsWithBoth);
    } catch (error) {
        console.error('Error fetching user comments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
