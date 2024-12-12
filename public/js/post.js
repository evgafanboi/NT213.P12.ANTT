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

// Function to search posts
async function searchPosts(query) {
    try {
        const response = await fetch(`/api/posts/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Search failed');
        }
        return await response.json();
    } catch (error) {
        console.error('Search error:', error);
        return [];
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
            this.disabled = true;
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

    // Search functionality
    const searchForm = document.getElementById('search-form');
    
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const searchInput = searchForm.querySelector('input[name="search"]');
            const searchQuery = searchInput.value.trim();
            
            if (searchQuery) {
                // Get current page URL
                const currentPath = window.location.pathname;
                
                // Construct new URL with search query
                const newUrl = `/home?search=${encodeURIComponent(searchQuery)}`;
                
                // Redirect to the new URL
                window.location.href = newUrl;
            }
        });
    }
});
