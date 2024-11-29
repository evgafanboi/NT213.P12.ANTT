const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const db = require('../db/database');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { renderAndSanitizeMarkdown } = require(path.join(__dirname, '..', 'utils', 'markdown'));

const homeRateLimiter = rateLimit({
  windowMs: 600000, // 10 minutes
  max: 50 // limit each IP to 50 requests per windowMs
});

const rateLimiter = rateLimit({
  windowMs: 900000, // 15 minutes
  max: 30 // limit each IP to 30 requests per windowMs
});

const strictRateLimiter = rateLimit({
  windowMs: 900000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers  
});

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Create a new post
router.post('/', strictRateLimiter, [
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
      message: 'Unexpected error',
      details: error.message // Include error details
    });
  }
});

// Get total number of posts
router.get('/count', rateLimiter, async (req, res) => {
    try {
        const result = await db.get('SELECT COUNT(*) as total FROM posts');
        res.json({ total: result.total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Unexpected error' });
    }
});


router.get('/', rateLimiter, async (req, res) => {
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
        res.status(500).json({ message: 'Unexpected error' });
    }
});

// Get a specific post
router.get('/:id/page', rateLimiter, async (req, res) => {
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
            return res.status(404).render('error', {
                title: '404 - Not Found',
                message: 'Post not found',
                cssPath: '/css/home.css'
            });
        }
        const sanitizedContent = renderAndSanitizeMarkdown(post.content);
        res.render('post', { 
            post,
            renderedContent: sanitizedContent,
            isLoggedIn: !!req.session.userId
        });

    } catch (error) {
        console.error('Error in post route:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load post',
            cssPath: '/css/home.css'
        });
    }
});

// Update a post
router.put('/:id', strictRateLimiter, [
  body('title').optional().isLength({ min: 1 }).trim(),
  body('content').optional().isLength({ min: 1 }).trim(),
], checkAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    // First verify ownership
    const post = await db.get('SELECT * FROM posts WHERE id = ? AND email = ?', 
      [req.params.id, req.session.userId]);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Explicit update query
    await db.run(`
      UPDATE posts 
      SET 
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND email = ?`,
      [title, content, req.params.id, req.session.userId]
    );

    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unexpected error' });
  }
});

// Delete a post
router.delete('/:id', rateLimiter, checkAuth, async (req, res) => {
    try {
        // First verify the post exists and belongs to the user
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
        res.status(500).json({ message: 'Unexpected error' });
    }
});

// Get posts review and render home page
router.get('/home', homeRateLimiter, async (req, res) => {
    try {
        const posts = await db.all(`
            SELECT 
                p.id,
                p.title,
                p.content,
                p.created_at,
                u.username as author_name
            FROM posts p
            LEFT JOIN users u ON p.email = u.email
            ORDER BY p.created_at DESC
            LIMIT 10
        `);

        // Pre-render markdown for each post
        const postsWithMarkdown = posts.map(post => ({
            ...post,
            title: post.title, // Keep title as is
            content: renderAndSanitizeMarkdown(post.content), // Pre-render the content
            created_at: post.created_at,
            author_name: post.author_name
        }));

        res.render('home', { 
            posts: postsWithMarkdown,
            isLoggedIn: !!req.session.userId
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load posts',
            cssPath: '/css/home.css'
        });
    }
});

// Get raw post content for editing
router.get('/:id/raw', rateLimiter, checkAuth, async (req, res) => {
    try {
        const post = await db.get(`
            SELECT 
                p.id,
                p.title,
                p.content,
                p.email
            FROM posts p
            WHERE p.id = ?
        `, [req.params.id]);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if the user owns this post
        if (post.email !== req.session.userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // Return raw content without markdown rendering
        res.json({
            id: post.id,
            title: post.title,
            content: post.content
        });

    } catch (error) {
        console.error('Error fetching raw post:', error);
        res.status(500).json({ message: 'Unexpected error' });
    }
});

module.exports = router;