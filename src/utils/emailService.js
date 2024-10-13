require('dotenv').config();
const nodemailer = require('nodemailer');

// STRICLY FOR DEBUG PURPOSE:
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  // Uses Gmail
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generates a random 6-digit code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Async function to send verification email
async function sendVerificationEmail(email, code) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Email Verification for Your Account',
    text: `Your verification code is: ${code}`,
    html: `<p>Your verification code is: <strong>${code}</strong></p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('A verification email was sent.');
  } catch (error) {
    console.error('Error sending a verification email:', error);
    throw error;
  }
}
module.exports = { generateVerificationCode, sendVerificationEmail };