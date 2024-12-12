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
        // Encode the query for the URL
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(`/api/posts/search?query=${encodedQuery}`);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        return await response.json();
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

// Function to render search results
function renderSearchResults(posts) {
    const newsFeed = document.querySelector('.news-feed');
    
    // Clear existing posts
    newsFeed.innerHTML = '';

    if (posts.length === 0) {
        newsFeed.innerHTML = '<p>No posts found</p>';
        return;
    }

    // Render search results
    posts.forEach(post => {
        const postElement = document.createElement('article');
        postElement.classList.add('post-preview');
        postElement.innerHTML = `
            <h3>${post.title}</h3>
            <div class="post-content-preview">${post.content}</div>
            <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
            <a href="/post/${post.id}" class="view-post">View Post</a>
        `;
        newsFeed.appendChild(postElement);
    });
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

    // Check for initial search query
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearchQuery = urlParams.get('search');

    // Search bar
    const searchForm = document.getElementById('search-form');
    const searchInput = searchForm.querySelector('input[name="search"]');
    
    // If there's an initial search query, perform search
    if (initialSearchQuery) {
        const decodedSearchQuery = decodeURIComponent(initialSearchQuery);
        searchInput.value = decodedSearchQuery;
        await performSearch(decodedSearchQuery);    //decode and search
    }

    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const searchQuery = searchInput.value.trim();
            
            if (searchQuery) {
                // Properly encode the search query
                const encodedSearchQuery = encodeURIComponent(searchQuery);
                
                // Update URL with fully encoded query
                const newUrl = `/home?search=${encodedSearchQuery}`;
                
                // Use replaceState to update URL without creating history entry
                history.replaceState({ path: newUrl }, '', newUrl);
                
                // Perform search with the original query
                await performSearch(searchQuery);
            }
        });
    }

    // Handle browser back/forward navigation for search
    window.addEventListener('popstate', async (event) => {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');

        if (searchQuery) {
            // Decode the search query
            const decodedSearchQuery = decodeURIComponent(searchQuery);
            searchInput.value = decodedSearchQuery;
            await performSearch(decodedSearchQuery);
        } else {
            // If there is no search query, reload original posts
            window.location.reload();
        }
    });
});

async function performSearch(query) {
    try {
        const posts = await searchPosts(query);
        renderSearchResults(posts);
    } catch (error) {
        console.error('Search error:', error);
    }
}

