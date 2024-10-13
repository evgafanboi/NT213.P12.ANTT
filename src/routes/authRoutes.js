const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { generateVerificationCode, sendVerificationEmail } = require('../utils/emailService');

// Temporary storage for verification codes (no need for a database since it has a very short expiration time)
const verificationCodes = new Map();

// Check the code if it's expired
function isCodeExpired(timestamp) {
  const expirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  return Date.now() - timestamp > expirationTime;
}

// Register route/send verification email
router.post('/register/send-code', [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, username, password } = req.body;

  try {
    // Check if user already exists
    const user = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (user) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const verificationCode = generateVerificationCode();
    verificationCodes.set(email, {
      code: verificationCode,
      username,
      password,
      timestamp: Date.now() // Add timestamp
    });

    await sendVerificationEmail(email, verificationCode);

    res.status(200).json({ message: 'Verification code sent to your email. Valid for 5 minutes.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register route/verify code and write account to database
router.post('/register/verify', [
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
    if (!storedData || storedData.code !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (isCodeExpired(storedData.timestamp)) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    const { username, password } = storedData;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

    // Remove verification code from storage
    verificationCodes.delete(email);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', [
  body('username').trim().escape(),
  body('password').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  const deviceId = req.headers['user-agent'] || 'unknown';

  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const device = await db.get('SELECT * FROM devices WHERE user_id = ? AND device_id = ?', [user.id, deviceId]);
    const needsVerification = !device || (Date.now() - new Date(device.last_login).getTime() > 7 * 24 * 60 * 60 * 1000);

    if (needsVerification) {
      const verificationCode = generateVerificationCode();
      verificationCodes.set(user.email, {
        code: verificationCode,
        userId: user.id,
        deviceId: deviceId,
        timestamp: Date.now()
      });
      await sendVerificationEmail(user.email, verificationCode);
      return res.status(200).json({ message: '2FA required', require2FA: true, email: user.email });
    }

    await db.run('UPDATE devices SET last_login = CURRENT_TIMESTAMP WHERE user_id = ? AND device_id = ?', [user.id, deviceId]);
    req.session.userId = user.id;

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

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out, please try again' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get user profile
router.get('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  db.get('SELECT id, username FROM users WHERE id = ?', [req.session.userId])
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    });
});

// Update user profile
router.put('/profile', [
  body('username').optional().isLength({ min: 3 }).trim().escape(),
  body('password').optional().isLength({ min: 6 }),
], async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  const updates = {};

  if (username) updates.username = username;
  if (password) updates.password = await bcrypt.hash(password, 10);

  try {
    await db.run(
      'UPDATE users SET ' + Object.keys(updates).map(key => `${key} = ?`).join(', ') + ' WHERE id = ?',
      [...Object.values(updates), req.session.userId]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

// Route to check if the email being used to register is already in use
router.post('/check-email', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        res.json({ available: !user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/verify-2fa', [
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
    if (!storedData || storedData.code !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (isCodeExpired(storedData.timestamp)) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: 'Verification code has expired. Please try logging in again.' });
    }

    const { userId, deviceId } = storedData;

    await db.run('INSERT OR REPLACE INTO devices (user_id, device_id, last_login) VALUES (?, ?, CURRENT_TIMESTAMP)', [userId, deviceId]);

    verificationCodes.delete(email);
    req.session.userId = userId;
    res.status(200).json({ message: 'Logged in successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;