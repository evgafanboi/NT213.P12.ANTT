require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const helmet = require('helmet');
const xss = require('xss-clean');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');

const app = express();

// Middleware setup
app.use(helmet());
app.use(xss());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
app.use(session({
  store: new SQLiteStore({
    db: 'data/sessions.sqlite',
    dir: path.join(__dirname, '..')
  }),
  secret: process.env.SESSION_SECRET || 'your secret key', // TODO: Change this to a random string
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Route handlers
app.use('/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Redirect root to login
app.get('/', (req, res) => res.redirect('/login'));

// Serve login and register pages
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));

// 404 handler
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'views', '404.html')));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'views', '500.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  req.session.userId ? next() : res.status(401).json({ message: 'Unauthorized' });
};