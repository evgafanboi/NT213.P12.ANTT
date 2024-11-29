async function getCsrfToken() {
    const response = await fetch('/csrf-token');
    const { token } = await response.json();
    return token;
}

// Function to fetch user profile data
async function fetchUserProfile() {
    try {
        const response = await fetch('/auth/profile', {
            credentials: 'include'
        });
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}

// Function to check if the user is logged in
async function checkLoginStatus() {
    const usernameDiv = document.querySelector('.username');
    
    const userProfile = await fetchUserProfile();
    
    if (userProfile) {
        // User is logged in, show username and logout option
        usernameDiv.innerHTML = `
            <a href="/profile"><p class="user-name">${userProfile.username}</p></a>
            <button class="logout-btn">Logout</button>
        `;
        
        // Register logout handler
        document.querySelector('.logout-btn').addEventListener('click', async () => {
            try {
                const response = await fetch('/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'x-csrf-token': await getCsrfToken()
                    }
                });
                if (response.ok) {
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    } else {
        // User is not logged in, show login link
        usernameDiv.innerHTML = `<a href="/login" class="login-redirect">Login</a>`;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await checkLoginStatus();
});
