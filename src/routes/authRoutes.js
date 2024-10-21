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

// Custom password validator
const passwordValidator = (value) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{9,}$/;
  if (!passwordRegex.test(value)) {
    throw new Error('Insecure password'); // this error goes back to the client
  }
  return true;
};

// Register route/send verification email
router.post('/register/send-code', [
  body('email').isEmail().normalizeEmail(),
  body('password').custom(passwordValidator), // Custom requirements for countering brute-force attacks
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
router.post('/verify', [
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

    if (storedData.type === 'registration') {
      const { email, password } = storedData;
      // Check existing user in db
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUser) {
        verificationCodes.delete(email);
        return res.status(400).json({ message: 'Invalid registration information' }); // Vague error message to prevent exploits.
      }
      const hashedPassword = await bcrypt.hash(password, 10); // Hash password  
      await db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
      verificationCodes.delete(email);
      res.status(201).json({ message: 'User registered successfully' });
    } else if (storedData.type === 'login') {
      const { userId, deviceId } = storedData;
      await db.run('INSERT OR REPLACE INTO devices (user_id, device_id, last_login) VALUES (?, ?, CURRENT_TIMESTAMP)', [userId, deviceId]);
      verificationCodes.delete(email);
      req.session.userId = userId;
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
router.post('/login', [
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
    const device = await db.get('SELECT * FROM devices WHERE user_id = ? AND device_id = ?', [user.id, deviceId]);
    const needsVerification = !device || (Date.now() - new Date(device.last_login).getTime() > 7 * 24 * 60 * 60 * 1000);

    if (needsVerification) {
      const verificationCode = generateVerificationCode();
      verificationCodes.set(user.email, {
        code: verificationCode,
        userId: user.id,
        deviceId: deviceId,
        timestamp: Date.now(),
        type: 'login'
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
  
  db.get('SELECT id FROM users WHERE id = ?', [req.session.userId])
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

module.exports = router;
