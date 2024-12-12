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

// Function to initialize post button
async function initializePostButton() {
    const createPostButton = document.getElementById('create-post-button');
    const modal = document.getElementById('post-modal');
    const closeBtn = document.querySelector('.close');
    const postForm = document.getElementById('post-form');

    // Show/hide create post button based on login status
    const userProfile = await fetchUserProfile();
    if (userProfile) {
        createPostButton.style.display = 'block';
    } else {
        createPostButton.style.display = 'none';
        return; // Exit early
    }

    // Modal controls
    createPostButton.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle post submission
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        postForm.disabled = true;

        try {
            // Check logged in state
            const userProfile = await fetchUserProfile();
            if (!userProfile) {
                alert('Please log in to create a post');
                window.location.href = '/login';
                return;
            }

            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': await getCsrfToken()
                },
                body: JSON.stringify({ title, content }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                modal.style.display = 'none';
                postForm.reset();
                window.location.reload();
            } else {
                alert(data.message || 'Failed to create post');
                if (data.message === 'Unauthorized') {
                    window.location.href = '/login';    // force redirect
                }
            }
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
        }
    });
}

function initializeNavbarToggle() {
    const navbar = document.querySelector('.navbar');
    const toggleButton = document.getElementById('navbar-toggle');
    
    toggleButton.addEventListener('click', () => {
        navbar.classList.toggle('collapsed');
        
        // Optional: Save the state to localStorage to remain navbar states across different urls
        localStorage.setItem('navbarCollapsed', navbar.classList.contains('collapsed'));
    });
    
    // Restore navbar state from localStorage on page load
    const isCollapsed = localStorage.getItem('navbarCollapsed') === 'true';
    if (isCollapsed) {
        navbar.classList.add('collapsed');
        toggleButton.textContent = '≡';
    }
}

function checkPostPreviewOverflow() {
    const postPreviews = document.querySelectorAll('.post-content-preview');
    
    postPreviews.forEach(preview => {
        // Reset to check actual content height
        preview.style.maxHeight = 'none';
        preview.style.overflow = 'visible';
        
        // Check if content exceeds 150px height
        if (preview.scrollHeight > 150) {
            preview.classList.add('overflowing');
        } else {
            preview.classList.remove('overflowing');
        }
    });
}

// Update the DOMContentLoaded event listener
window.addEventListener('DOMContentLoaded', async () => {
    await checkLoginStatus();
    await initializePostButton();
    initializeNavbarToggle();
    checkPostPreviewOverflow(); // overflow handler
});

