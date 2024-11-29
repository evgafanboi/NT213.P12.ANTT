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

const form = document.getElementById('loginForm');
const twoFAForm = document.getElementById('twoFAForm');
let userEmail = '';

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = new FormData(form);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const csrfToken = await getCsrfToken();
        
        const response = await fetch('/auth/login', {
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
            form.classList.add('hidden');
            twoFAForm.classList.remove('hidden');
            userEmail = result.email;
            startExpirationTimer();
        } else if (result.success) {
            window.location.href = '/home';
        } else {
            alert(result.message || 'An error occurred during login');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Login failed. Please try again.');
    } finally {
        submitButton.disabled = false;
    }
});

twoFAForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = twoFAForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = new FormData(twoFAForm);
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
        if (result.success) {
            window.location.href = '/home';
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

function startExpirationTimer() {
    const timerElement = document.createElement('p');
    timerElement.id = 'expirationTimer';
    twoFAForm.appendChild(timerElement);

    let timeLeft = 5 * 60; // 5 minutes, in seconds
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
        twoFAForm.classList.add('hidden');
        form.classList.remove('hidden');
        const timerElement = document.getElementById('expirationTimer');
        if (timerElement) timerElement.remove();
    });
    twoFAForm.appendChild(resendButton);
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
