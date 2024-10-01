const form = document.getElementById('registerForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const username = formData.get('username');
    const password = formData.get('password');
    const confirmPassword = formData.get('passwordClone');

    //basic comparison between 1st and 2nd password
    if (password !== confirmPassword) {
        alert('Mật khẩu không trùng khớp.');
        return;  //ignore
    }

    //if else send cred info to server
    const data = { username, password };

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = '/login';  //redirect to login.html
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Đăng ký không thành công!');
    }
});
