require('dotenv').config();
const https = require('https');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const helmet = require('helmet');
const xss = require('xss-clean');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const fs = require('fs');
const http = require('http');
const rateLimit = require('express-rate-limit');
const timeout = require('connect-timeout');
const ejs = require('ejs');
const db = require('./db/database');
const { doubleCsrf } = require('csrf-csrf');
const cookieParser = require('cookie-parser');
const winston = require('winston');
const crypto = require('crypto');

const app = express();

const nonceMiddleware = (req, res, next) => {
    // Generate a unique nonce for each request
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.nonce = nonce;
    next();
  };

app.use(nonceMiddleware);
// Middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        (req, res) => `'nonce-${res.locals.nonce}'`
      ],
      styleSrc: [
        "'self'", 
        (req, res) => `'nonce-${res.locals.nonce}'`
      ],
      imgSrc: ["'self'"],
      fontSrc: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  hidePoweredBy: true,
}));
app.use(xss());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../public')));
// Timeout
app.use(timeout('5s'));

// Session configuration
app.use(session({
  store: new SQLiteStore({
    db: 'data/sessions.sqlite',
    dir: path.join(__dirname, '..')
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,  // Reset cookie after set time below
  renewAfter: 3600000, // 1 hour in milliseconds
  cookie: { 
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 86400000 // 24 hours
  },
  name: 'sessionId'
}));

app.use(cookieParser());

// CSRF Configuration
const csrfProtection = doubleCsrf({
    getSecret: () => process.env.SESSION_SECRET,
    cookieName: "x-csrf-token",
    cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    },
    size: 64,
    ignoredMethods: ["GET"],
    getTokenFromRequest: (req) =>  req.headers["x-csrf-token"],
});

const { generateToken, doubleCsrfProtection } = csrfProtection;

// Middleware to ensure CSRF cookie is set
app.use((req, res, next) => {
    // Only set token if it doesn't exist
    if (!req.cookies['x-csrf-token']) {
        generateToken(req, res);
    }
    const allowedHosts = [
        `localhost:${process.env.HTTPS_PORT}`,
        `localhost:${process.env.HTTP_PORT}`,
        '127.0.0.1',
        process.env.ALLOWED_HOST
    ];

    const host = req.get('host');
    if (!allowedHosts.includes(host)) {
        console.log(`A request with invalid host header was received: ${host}`);
        return res.status(403).render('error', {
          title: '403 - Host not allowed',
          message: 'Hostname not allowed.',
          cssPath: '/css/home.css'
      });
    }
    next();
});

app.use(doubleCsrfProtection);

const csrfLimiter = rateLimit({
    windowMs: 600000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// CSRF token endpoint
app.get('/csrf-token', csrfLimiter, (req, res) => {
    try {
        const token = generateToken(req, res);
        res.json({ token });
    } catch (error) {
        console.error('CSRF Token Generation Error:', error);
        res.status(500).json({ 
            message: 'Failed to generate CSRF token',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Route handlers
app.use('/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Rate limiting
// very high limit for all public routes
const limiter = rateLimit({
  windowMs: 600000, // 10 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Rate limit hit.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use('/csrf-token', csrfLimiter);

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// ROOT DIR
app.get('/', async (req, res) => {
    const searchQuery = req.query.search || '';
    
    // Redirect to the posts home route with search query
    res.redirect(`/api/posts/home?search=${encodeURIComponent(searchQuery)}`);
});

// Serve login and register pages
app.get('/login', limiter, (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', limiter, (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));

// Server password reset page
app.get('/forgot-password', limiter, (req, res) => res.sendFile(path.join(__dirname, 'views', 'password-reset.html')));

// Serve publicly available pages
app.get('/home', async (req, res) => {
    // Delegate search handling to posts route
    const searchQuery = req.query.search || '';
    
    // Redirect to the posts home route with search query
    res.redirect(`/api/posts/home?search=${encodeURIComponent(searchQuery)}`);
});

// Redirect /post/:id to /api/posts/:id/page  (limiter is delegated to postRoutes' limiter)
app.get('/post/:id', (req, res) => {
    res.redirect(`/api/posts/${req.params.id}/page`);
});

// Redirect /profile to /auth/profile/page  (limiter is delegated to authRoutes' limiter)
app.get('/profile', (req, res) => {
    res.redirect('/auth/profile/page');
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Not Found',
        message: 'Page not found',
        cssPath: '/css/home.css'
    });
});


// Error handler
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('error', {
          title: '403 - CSRF error',
          message: 'Invalid CSRF token',
          cssPath: '/css/home.css'
      });
    }
    next(err);
});

// SSL/TLS configuration
const options = {
  key: fs.readFileSync(path.join(__dirname, '..', 'ssl', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'ssl', 'cert.pem'))
};

// Create HTTPS server
const httpsServer = https.createServer(options, app);

// Create HTTP server that redirects to HTTPS
const httpServer = http.createServer((req, res) => {
    if (req.headers.host) {
        const httpsUrl = `https://${req.headers.host.split(':')[0]}:${HTTPS_PORT}${req.url}`;
        res.writeHead(301, { "Location": httpsUrl });
    } else {
        console.error('Host header is undefined');
        res.status(400).render('error', {
          title: '400 - Bad host header',
          message: 'The host header is incorrect.',
          cssPath: '/css/home.css'
      });
        return;
    }
    res.end();
});

// Start both servers
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const HTTP_PORT = process.env.HTTP_PORT || 80;

httpsServer.listen(HTTPS_PORT, () => console.log(`HTTPS Server running on port ${HTTPS_PORT}`));
httpServer.listen(HTTP_PORT, () => console.log(`HTTP Server running on port ${HTTP_PORT}`));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  req.session.userId ? next() : res.status(401).json({ message: 'Unauthorized' });
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Use in your error handling
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  res.status(500).render('error', {
    title: '500 - Unexpected error',
    message: 'An error occured. Please revisit the page some other time.',
    cssPath: '/css/home.css'
  });
});
