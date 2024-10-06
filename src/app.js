const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const helmet = require('helmet');
const xss = require('xss-clean');
const authRoutes = require('./routes/authRoutes');
const app = express();

// Helmet to set various HTTP headers and XSS-Clean to prevent XSS attacks
app.use(helmet());
app.use(xss());

// Parse JSON bodies and limit the payload size
app.use(express.json({limit: '10kb'}));
// Parse URL-encoded bodies and limit the payload size
app.use(express.urlencoded({extended: true, limit: '10kb'}));

app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  store: new SQLiteStore({ 
    db: 'data/sessions.sqlite',
    dir: path.join(__dirname, '..') 
  }),
  secret: process.env.SESSION_SECRET || 'your secret key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use('/auth', authRoutes);

// Redirect empty path to /login (pro websites do this)
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Register route
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'views', '500.html'));
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));