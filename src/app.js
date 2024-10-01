const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the 'public' directory: js, css, images, etc.
app.use(express.static(path.join(__dirname, 'template')));

// Root route - redirect to login page
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login route - serve the login.html file
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'template', 'login.html'));
});

// MySQL connection
const dbConfig = {
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'blog_db',
};

const pool = mysql.createPool(dbConfig);

// Session store
const sessionStore = new MySQLStore({}, pool);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  key: 'session_cookie_name',
  secret: 'session_cookie_secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// RouteController
/*
app.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blogs ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/                                                                  //##DEFAULT ROUTE##
app.post('/blog', async (req, res) => {
  const { title, content } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO blogs (title, content) VALUES (?, ?)', [title, content]);
    res.json({ id: result.insertId, message: 'Blog post created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/comment', upload.single('image'), [
  body('content').trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { blogId, content } = req.body;
  const imagePath = req.file ? req.file.path : null;

  try {
    const sanitizedContent = sanitizeHtml(content);
    const [result] = await pool.query('INSERT INTO comments (blog_id, content, image_path) VALUES (?, ?, ?)', [blogId, sanitizedContent, imagePath]);
    res.json({ id: result.insertId, message: 'Comment added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/register', async (req, res) => {
  const { username, password, isAdmin } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.query('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', [username, hashedPassword, isAdmin]);
    res.json({ id: result.insertId, message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.userId = user.id;
    req.session.isAdmin = user.is_admin;
    res.json({ message: 'Logged in successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// AI Chat route (using a hypothetical open-source AI API)
app.post('/ai-chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await axios.post('https://opensource-ai-api.example.com/chat', { message });
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});