const form = document.getElementById('loginForm');
const twoFAForm = document.getElementById('twoFAForm');
let userEmail = '';

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const formData = new FormData(form);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.require2FA) {
            form.style.display = 'none';
            twoFAForm.style.display = 'block';
            userEmail = result.email;
            startExpirationTimer();
        } else if (result.success) {
            alert('Logged in successfully');
            // Redirect to profile page or dashboard
            // window.location.href = '/profile';
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
        const response = await fetch('/auth/verify-2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            alert('Logged in successfully');
            // Redirect to profile page or dashboard
            // window.location.href = '/profile';
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
        twoFAForm.style.display = 'none';
        form.style.display = 'block';
        const timerElement = document.getElementById('expirationTimer');
        if (timerElement) timerElement.remove();
    });
    twoFAForm.appendChild(resendButton);
}
