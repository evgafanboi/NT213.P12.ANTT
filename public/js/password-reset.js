async function getCsrfToken() {
    try {
        const response = await fetch('/csrf-token');
        if (!response.ok) {
            throw new Error('Failed to get CSRF token');
        }
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Error getting CSRF token:', error);
        throw error;
    }
}

// Email Form
const emailForm = document.getElementById('emailForm');
const verificationForm = document.getElementById('verificationForm');
const passwordResetForm = document.getElementById('passwordResetForm');

let userEmail = '';

// Email Submission Handler
emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = emailForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = new FormData(emailForm);
    const data = {
        email: formData.get('email')
    };

    try {
        const csrfToken = await getCsrfToken();
        
        const response = await fetch('/auth/forgot-password', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        const result = await response.json();
        if (result.require2FA) {
            emailForm.classList.add('hidden');
            verificationForm.classList.remove('hidden');
            userEmail = data.email;
            startExpirationTimer();
        } else {
            alert(result.message || 'An error occurred');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Request failed. Please try again.');
    } finally {
        submitButton.disabled = false;
    }
});

// Verification Code Submission Handler
verificationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = verificationForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = new FormData(verificationForm);
    const data = {
        email: userEmail,
        code: formData.get('verificationCode')
    };

    try {
        const csrfToken = await getCsrfToken();
        
        const response = await fetch('/auth/verify', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        const result = await response.json();
        if (result.allowPasswordReset) {
            verificationForm.classList.add('hidden');
            passwordResetForm.classList.remove('hidden');
        } else {
            alert(result.message || 'Invalid verification code');
            if (result.message.includes('expired')) {
                showResendButton();
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Verification failed. Please try again.');
    } finally {
        submitButton.disabled = false;
    }
});

// Password Reset Submission Handler
passwordResetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = passwordResetForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = new FormData(passwordResetForm);
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        submitButton.disabled = false;
        return;
    }

    const data = {
        newPassword: newPassword
    };

    try {
        const csrfToken = await getCsrfToken();
        
        const response = await fetch('/auth/reset-password', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        const result = await response.json();
        if (result.success) {
            alert('Password reset successfully. Please log in.');
            window.location.href = '/login';
        } else {
            alert(result.message || 'Password reset failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Password reset failed. Please try again.');
    } finally {
        submitButton.disabled = false;
    }
});

function startExpirationTimer() {
    const timerElement = document.createElement('p');
    timerElement.id = 'expirationTimer';
    verificationForm.appendChild(timerElement);

    let timeLeft = 180; // 3 minutes, in seconds
    const timerId = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerId);
            timerElement.textContent = 'Verification code has expired. Please request a new one.';
            showResendButton();
        }
        timeLeft--;
    }, 1000);
}

function showResendButton() {
    const resendButton = document.createElement('button');
    resendButton.textContent = 'Resend Verification Code';
    resendButton.addEventListener('click', () => {
        verificationForm.classList.add('hidden');
        emailForm.classList.remove('hidden');
        const timerElement = document.getElementById('expirationTimer');
        if (timerElement) timerElement.remove();
    });
    verificationForm.appendChild(resendButton);
}

// Password validation AJAX
function validatePassword(password) {
    const minLength = 9;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password);

    return {
        isValid: password.length >= minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar,
        errors: [
            password.length < minLength ? 'At least 9 characters long' : null,
            !hasUppercase ? 'Include uppercase letters' : null,
            !hasLowercase ? 'Include lowercase letters' : null,
            !hasNumber ? 'Include numbers' : null,
            !hasSpecialChar ? 'Include special characters' : null
        ].filter(Boolean)
    };
}

// Function to handle password input validation
function handlePasswordInput(e) {
    const passwordInput = e.target;
    const password = passwordInput.value;
    const passwordError = document.getElementById('passwordError');
    const result = validatePassword(password);

    if (!result.isValid) {
        passwordError.innerHTML = 'Password must be:<br>' + result.errors.map(error => `- ${error}`).join('<br>');
        passwordInput.setCustomValidity('Invalid password');
    } else {
        passwordError.textContent = '';
        passwordInput.setCustomValidity('');
    }
}

// Add event listener for password validation
document.addEventListener('DOMContentLoaded', () => {
    // Add password validation to new password input
    document.querySelector('input[name="newPassword"]').addEventListener('input', handlePasswordInput);

    // Existing password toggle functionality
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.textContent = 'show';
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = 'hide';
            } else {
                input.type = 'password';
                this.textContent = 'show';
            }
        });
    });
});
