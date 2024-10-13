const registerForm = document.getElementById('registerForm');
const verificationForm = document.getElementById('verificationForm');
let userEmail = '';

// Function to make sure the email input is in the standard email format
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Function that sends POST to the server to check if the email is existing
function checkEmailAvailability(email) {
    return fetch('/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => data.available);
}

// A function to handle email input: if it does not meet the standard email format or a user with the same email is found, display an AJAX-wannabe message.
function handleEmailInput(e) {
    const emailInput = e.target;
    const email = emailInput.value;
    const emailError = document.getElementById('emailError');

    if (!validateEmail(email)) {
        emailError.textContent = 'Please enter a valid email address';
        emailInput.setCustomValidity('Invalid email address');
    } else {
        emailError.textContent = 'Checking email availability...';
        checkEmailAvailability(email)
            .then(available => {
                if (available) {
                    emailError.textContent = '';
                    emailInput.setCustomValidity('');
                } else {
                    emailError.textContent = 'This email is already registered';
                    emailInput.setCustomValidity('Email already registered');
                }
            })
            .catch(error => {
                console.error('Error checking email availability:', error);
                emailError.textContent = 'Error checking email availability';
            });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.querySelector('input[name="email"]');
    emailInput.addEventListener('input', handleEmailInput);

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(registerForm);
        const email = formData.get('email');
        const username = formData.get('username');
        const password = formData.get('password');
        const confirmPassword = formData.get('passwordClone');

        if (password !== confirmPassword) {
            alert('Mật khẩu không trùng khớp.');
            return;
        }

        const data = { email, username, password };

        try {
            const response = await fetch('https://' + window.location.hostname + '/auth/register/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                userEmail = email;
                registerForm.style.display = 'none';
                verificationForm.style.display = 'block';
                startExpirationTimer();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Gửi mã xác nhận không thành công!');
        }
    });

    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(verificationForm);
        const code = formData.get('verificationCode');

        const data = { email: userEmail, code };

        try {
            const response = await fetch('https://' + window.location.hostname + '/auth/register/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                window.location.href = '/login';
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

    // Live timer to put extra pressure on the user
    function startExpirationTimer() {
        const timerElement = document.createElement('p');
        timerElement.id = 'expirationTimer';
        verificationForm.appendChild(timerElement);

        let timeLeft = 5 * 60; // 5 minutes, in seconds
        const timerId = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`; // ticktack mf
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                timerElement.textContent = 'Verification code has expired. Please request a new one.';
                showResendButton();
            }
            timeLeft--;
        }, 1000);
    }

    // Show the resend button once the timer expires
    function showResendButton() {
        const resendButton = document.createElement('button');
        resendButton.textContent = 'Resend Verification Code';
        resendButton.addEventListener('click', () => {
            verificationForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
        verificationForm.appendChild(resendButton);
    }
});
