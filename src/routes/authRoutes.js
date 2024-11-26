const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const rateLimit = require('express-rate-limit');
const { generateVerificationCode, sendVerificationEmail } = require('../utils/emailService');
const { generateUsername } = require('../utils/usernameGenerator');
const { renderAndSanitizeMarkdown } = require('../utils/markdown');

// Temporary storage for verification codes
const verificationCodes = new Map();

const VALID_DURATION = 604800000; // 1 WEEK in milliseconds
const WINDOWMS = 900000; // 15 minutes in milliseconds

const rateLimiter = rateLimit({
  windowMs: WINDOWMS, // 15 minutes
  max: 5 // limit each IP to 5 login attempts per windowMs
});


// Check if the code is expired
function isCodeExpired(timestamp) {
  const expirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  return Date.now() - timestamp > expirationTime;
}

// Custom password validator
const passwordValidator = (value) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{9,}$/;
  if (!passwordRegex.test(value)) {
    throw new Error('Insecure password');
  }
  return true;
};

// Register route/send verification email
router.post('/register/send-code', rateLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').custom(passwordValidator),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if user already exists
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (user) {
      return res.status(400).json({ message: 'Invalid registration information' });
    }

    const verificationCode = generateVerificationCode();
    verificationCodes.set(email, {
      code: verificationCode,
      email,
      password,
      timestamp: Date.now(),
      type: 'registration'
    });

    await sendVerificationEmail(email, verificationCode);

    res.status(200).json({ message: 'Verification code sent to your email. Valid for 5 minutes.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unified verification endpoint for both registration 2FA and login 2FA
router.post('/verify', rateLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).isNumeric(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, code } = req.body;

  try {
    const storedData = verificationCodes.get(email);
    const deviceId = req.headers['user-agent'] || 'unknown';
    if (!storedData || storedData.code !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (isCodeExpired(storedData.timestamp)) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // ========== for registration ===========
    if (storedData.type === 'registration') {
      const { email, password } = storedData;

      // Check existing user in db
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUser) {
        verificationCodes.delete(email);
        return res.status(400).json({ message: 'Invalid registration information' }); // Vague error message to prevent exploits.
      }

      const username = await generateUsername();
      const hashedPassword = await bcrypt.hash(password, 10); // Hash password
      await db.run('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', [email, username, hashedPassword]);

      // Insert into devices table when creating new account to prevent double 2FA
      await db.run('INSERT INTO devices (user_email, device_id, last_login) VALUES (?, ?, CURRENT_TIMESTAMP)', [email, deviceId]);

      // Set user_email in session
      req.session.userId = email; // Store email as userId
      verificationCodes.delete(email);
      res.status(201).json({ message: 'User registered successfully' });
    }

    // ========== for login ==============
    else if (storedData.type === 'login') {
      await db.run('INSERT OR REPLACE INTO devices (user_email, device_id, last_login) VALUES (?, ?, CURRENT_TIMESTAMP)', [user_email, deviceId]);
      verificationCodes.delete(email);
      req.session.userId = user_email; // Store email as userId
      res.status(200).json({ message: 'Logged in successfully' });
    } else {
      return res.status(400).json({ message: 'Invalid verification type' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', rateLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const deviceId = req.headers['user-agent'] || 'unknown';

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check the last login time. If it's been more than 7 days, require 2FA.
    const device = await db.get('SELECT * FROM devices WHERE user_email = ? AND device_id = ?', [email, deviceId]);
    const needsVerification = !device || (Date.now() - new Date(device.last_login).getTime() > VALID_DURATION);

    if (needsVerification) {
      const verificationCode = generateVerificationCode();
      verificationCodes.set(email, {
        code: verificationCode,
        user_email: email,
        deviceId: deviceId,
        timestamp: Date.now(),
        type: 'login'
      });
      await sendVerificationEmail(email, verificationCode);
      return res.status(200).json({ message: '2FA required', require2FA: true, email: email });
    }

    // Update the valid time
    await db.run('UPDATE devices SET last_login = CURRENT_TIMESTAMP WHERE user_email = ? AND device_id = ?', [email, deviceId]);
    req.session.userId = email; // Store email as userId

    // Return success message
    res.json({ success: true, message: 'Logged in successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check session route
router.get('/check-session', (req, res) => {
  if (req.session.userId) {
    res.json({ isLoggedIn: true });
  } else {
    res.json({ isLoggedIn: false });
  }
});

// Logout route -------------------------------------TODO: remove user's device record from the db------------------------------------------------
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out, please try again' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// API endpoint for profile data (used by fetchUserProfile())
router.get('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = await db.get('SELECT email, username FROM users WHERE email = ?', 
            [req.session.userId]);
        res.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Page render endpoint
router.get('/profile/page', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');  // If attempting to view profile without being logged in, redirect to /login
    }

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [req.session.userId]);
        const posts = await db.all(`
            SELECT id, title, content, created_at 
            FROM posts 
            WHERE email = ? 
            ORDER BY created_at DESC`, 
            [req.session.userId]
        );

        // Add null check for post content
        posts.forEach(post => {
            if (!post.content) {
                post.content = ''; // Set empty string if content is null, failsafe
            }
        });

        res.render('profile', { 
            user,
            posts,
            renderAndSanitizeMarkdown: require('../utils/markdown').renderAndSanitizeMarkdown
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Failed to load profile',
            cssPath: '/css/home.css'
        });
    }
});

// Update user profile
router.put('/profile', [
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().custom(passwordValidator),
], async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const updates = {};

  if (email) updates.email = email;
  if (password) updates.password = await bcrypt.hash(password, 10);

  try {
    await db.run(
      'UPDATE users SET ' + Object.keys(updates).map(key => `${key} = ?`).join(', ') + ' WHERE email = ?',
      [...Object.values(updates), req.session.userId]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// helper function, probably not needed but left just in case
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

// Update username endpoint
router.post('/update-username', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { username } = req.body;
    
    if (!username || username.trim().length === 0) {
        return res.status(400).json({ message: 'Username cannot be empty' });
    }

    try {
        await db.run('UPDATE users SET username = ? WHERE email = ?', 
            [username.trim(), req.session.userId]);
        
        res.json({ success: true, message: 'Username updated successfully' });
    } catch (error) {
        console.error('Error updating username:', error);
        res.status(500).json({ message: 'Failed to update username' });
    }
});


module.exports = router;
