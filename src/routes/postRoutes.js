const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const db = require('../db/database');

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Create a new post
router.post('/', [
  body('title').trim().escape(),
  body('content').trim(),
], checkAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content } = req.body;
    
    const result = await db.run(
      'INSERT INTO posts (title, content, email) VALUES (?, ?, ?)',
      [title, content, req.session.userId]
    );

    res.status(201).json({ 
      id: result.lastID,
      message: 'Post created successfully' 
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      message: 'Server error',
      details: error.message // Include error details
    });
  }
});

// Get total number of posts
router.get('/count', async (req, res) => {
    try {
        const result = await db.get('SELECT COUNT(*) as total FROM posts');
        res.json({ total: result.total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Modify the get all posts route to support pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get posts with user information
        const posts = await db.all(`
            SELECT 
                p.id,
                p.title,
                p.content,
                p.created_at,
                p.updated_at,
                u.username as author_name,
                u.email as author_email
            FROM posts p
            LEFT JOIN users u ON p.email = u.email
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
        
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get a specific post
router.get('/:id', async (req, res) => {
    try {
        const post = await db.get(`
            SELECT 
                p.id,
                p.title,
                p.content,
                p.created_at,
                p.updated_at,
                u.username as author_name
            FROM posts p
            LEFT JOIN users u ON p.email = u.email
            WHERE p.id = ?
        `, [req.params.id]);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a post
router.put('/:id', [
  body('title').optional().isLength({ min: 1 }).trim(),
  body('content').optional().isLength({ min: 1 }).trim(),
], checkAuth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content } = req.body;
  const updates = {};

  if (title) updates.title = title;
  if (content) updates.content = content;

  try {
    const post = await db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.email !== req.session.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.run(
      'UPDATE posts SET ' + Object.keys(updates).map(key => `${key} = ?`).join(', ') + ' WHERE id = ?',
      [...Object.values(updates), req.params.id]
    );
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a post
router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const post = await db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.email !== req.session.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;