// Function to fetch user profile data
async function fetchUserProfile() {
    try {
        const response = await fetch('/auth/profile', {
            credentials: 'include' // Important for sending cookies
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
                    credentials: 'include'
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
                    'Content-Type': 'application/json'
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

// Add this function
function initializeNavbarToggle() {
    const navbar = document.querySelector('.navbar');
    const toggleButton = document.getElementById('navbar-toggle');
    
    toggleButton.addEventListener('click', () => {
        navbar.classList.toggle('collapsed');
        
        // Optional: Save the state to localStorage
        localStorage.setItem('navbarCollapsed', navbar.classList.contains('collapsed'));
    });
    
    // Restore navbar state from localStorage on page load
    const isCollapsed = localStorage.getItem('navbarCollapsed') === 'true';
    if (isCollapsed) {
        navbar.classList.add('collapsed');
        toggleButton.textContent = '▶';
    }
}

// Add these functions
async function fetchPosts(page = 1, limit = 10) {
    try {
        const response = await fetch(`/api/posts?page=${page}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        return await response.json();
    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
}

async function fetchTotalPosts() {
    try {
        const response = await fetch('/api/posts/count');
        if (!response.ok) throw new Error('Failed to fetch post count');
        const data = await response.json();
        return data.total;
    } catch (error) {
        console.error('Error fetching post count:', error);
        return 0;
    }
}

async function initializeNewsFeed() {
    const newsFeed = document.querySelector('.news-feed');
    const postsPerPage = 10;
    let currentPage = 1;
    
    // Get total posts for pagination
    const totalPosts = await fetchTotalPosts();
    const totalPages = Math.ceil(totalPosts / postsPerPage);
    
    // Initial load
    const posts = await fetchPosts(currentPage, postsPerPage);
    renderPosts(posts);
    
    // Add pagination controls if needed
    if (totalPages > 1) {
        renderPagination(currentPage, totalPages);
    }
}

function renderPosts(posts) {
    const newsFeed = document.querySelector('.news-feed');
    newsFeed.innerHTML = posts.map(post => `
        <article class="post" data-post-id="${post.id}">
            <header class="post-header">
                <h2>${post.title}</h2>
                <div class="post-meta">
                    <span class="author">${post.author_name || 'Anonymous'}</span>
                    <span class="date">${new Date(post.created_at).toLocaleDateString()}</span>
                </div>
            </header>
            <div class="post-content">
                ${post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content}    
            </div>
        </article>
    `).join('');

document.querySelectorAll('.post').forEach(post => {
    post.addEventListener('click', function() {
        const postId = this.dataset.postId;
        window.location.href = `/post/${postId}`;
    });
});
}

function renderPagination(currentPage, totalPages) {
    const newsFeed = document.querySelector('.news-feed');
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    
    paginationDiv.innerHTML = `
        <button class="prev-page" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button class="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
    `;
    
    newsFeed.after(paginationDiv);
    
    // Add pagination event listeners
    document.querySelector('.prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) loadPage(currentPage - 1);
    });
    
    document.querySelector('.next-page')?.addEventListener('click', () => {
        if (currentPage < totalPages) loadPage(currentPage + 1);
    });
}

async function loadPage(page) {
    const posts = await fetchPosts(page);
    renderPosts(posts);
    // Update pagination UI
    const totalPosts = await fetchTotalPosts();
    const totalPages = Math.ceil(totalPosts / 10);
    renderPagination(page, totalPages);
}
// Call the function on page load
window.addEventListener('DOMContentLoaded', async () => {
    await checkLoginStatus();
    await initializePostButton();
    initializeNavbarToggle();
    await initializeNewsFeed();
});

