const registerForm = document.getElementById('registerForm');
const verificationForm = document.getElementById('verificationForm');
let userEmail = '';

async function getCsrfToken() {
    const response = await fetch('/csrf-token');
    const { token } = await response.json();
    return token;
}

// Function to make sure the email input is in the standard email format
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// A function to handle email input
function handleEmailInput(e) {
    const emailInput = e.target;
    const email = emailInput.value;
    const emailError = document.getElementById('emailError');

    if (!validateEmail(email)) {
        emailError.textContent = 'Please enter a valid email address';
        emailInput.setCustomValidity('Invalid email address');
    } else {
        emailError.textContent = '';
        emailInput.setCustomValidity('');
    }
}

// Function to validate password strength, FE AJAX
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

// Function to handle password input
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

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('input[name="email"]').addEventListener('input', handleEmailInput);
    document.querySelector('input[name="password"]').addEventListener('input', handlePasswordInput);

    const submitButton = registerForm.querySelector('button[type="submit"]');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Disable the submit button immediately
        submitButton.disabled = true;
        
        const formData = new FormData(registerForm);
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('passwordClone');

        if (password !== confirmPassword) {
            alert('Mismatched passwords.');
            submitButton.disabled = false; // Re-enable the button
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            alert('Please enter a secure password that meets all requirements.');
            submitButton.disabled = false; // Re-enable the button
            return;
        }

        const data = { email, password };

        try {
            const csrfToken = await getCsrfToken();
            const response = await fetch('/auth/register/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken 
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                userEmail = email;
                registerForm.classList.add('hidden');
                verificationForm.classList.remove('hidden');
                startExpirationTimer();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Failed to send a verfication code!');
        } finally {
            submitButton.disabled = false; // Re-enable the button
        }
    });

    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(verificationForm);
        const code = formData.get('verificationCode');

        const data = { email: userEmail, code };

        try {
            const csrfToken = await getCsrfToken();
            const response = await fetch('/auth/verify', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken 
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                window.location.href = '/home';
            } else {
                alert(result.message);
                if (result.message.includes('expired')) {
                    showResendButton();
                }
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Xác nhận không thành công!');
        }
    });

    function startExpirationTimer() {
        const timerElement = document.createElement('p');
        timerElement.id = 'expirationTimer';
        verificationForm.appendChild(timerElement);

        let timeLeft = 180; // 3 minutes, - 300 seconds
        const timerId = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `Verification code valid for: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
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
            registerForm.classList.remove('hidden');
            const timerElement = document.getElementById('expirationTimer');
            if (timerElement) timerElement.remove();
        });
        verificationForm.appendChild(resendButton);
    }

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
