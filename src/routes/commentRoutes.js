const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/database');

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Create a new comment
router.post('/', [
  body('post_id').isInt(),
  body('content').isLength({ min: 1 }).trim().escape(),
], checkAuth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { post_id, content } = req.body;

  try {
    const result = await db.run(
      'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
      [req.session.userId, post_id, content]
    );
    res.status(201).json({ id: result.id, message: 'Comment created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for a specific post
router.get('/post/:postId', async (req, res) => {
  try {
    const comments = await db.all('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC', [req.params.postId]);
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a comment
router.put('/:id', [
  body('content').isLength({ min: 1 }).trim().escape(),
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
    if (comment.user_id !== req.session.userId) {
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
router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const comment = await db.get('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.user_id !== req.session.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.run('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
