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
// Initialize highlight.js with specific languages
hljs.configure({
    languages: ['javascript', 'python', 'bash', 'html', 'css', 'sql', 'sh', 'json', 'yaml', 'markdown', 'toml', 'c', 'cpp', 'java', 'php', 'ruby', 'swift', 'kotlin', 'go', 'rust', 'scala', 'haskell', 'erlang', 'elixir', 'dart', 'typescript'],
    cssSelector: 'pre code'
});

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

    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });

    // Navbar toggle logic
    const navbar = document.querySelector('.navbar');
    const toggleButton = document.getElementById('navbar-toggle');
    
    toggleButton.addEventListener('click', () => {
        navbar.classList.toggle('collapsed');
        toggleButton.textContent = '≡';
        localStorage.setItem('navbarCollapsed', navbar.classList.contains('collapsed'));
    });
    
    const isCollapsed = localStorage.getItem('navbarCollapsed') === 'true';
    if (isCollapsed) {
        navbar.classList.add('collapsed');
        toggleButton.textContent = '≡';
    }

    // Comments functionality
    const commentsList = document.querySelector('.comments-list');
    const postId = document.querySelector('.post').dataset.postId;
    let offset = 0;
    const limit = 5;

    async function loadComments() {
        try {
            const response = await fetch(`/api/comments/post/${postId}?limit=${limit}&offset=${offset}`);
            const comments = await response.json();
            
            if (comments.length > 0) {
                commentsList.innerHTML += comments.map(comment => `
                    <div class="comment" data-comment-id="${comment.id}">
                        <div class="comment-header">
                            <p class="comment-author">${comment.author_name || 'Anonymous'}</p>
                            <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="comment-content">
                            ${comment.content}
                        </div>
                    </div>
                `).join('');

                // Apply syntax highlighting to newly loaded comments
                document.querySelectorAll('.comment-content pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });

                // Add copy buttons to code blocks in comments
                document.querySelectorAll('.comment-content pre code').forEach((codeBlock) => {
                    const header = document.createElement('div');
                    header.className = 'code-block-header';

                    const copyButton = document.createElement('button');
                    copyButton.className = 'copy-button';
                    copyButton.innerHTML = '📋 Copy';
                    
                    copyButton.addEventListener('click', async () => {
                        try {
                            await navigator.clipboard.writeText(codeBlock.textContent);
                            copyButton.innerHTML = '✅ Copied!';
                            setTimeout(() => {
                                copyButton.innerHTML = '📋 Copy';
                            }, 2000);
                        } catch (err) {
                            console.error('Failed to copy:', err);
                            copyButton.innerHTML = '❌ Error!';
                            setTimeout(() => {
                                copyButton.innerHTML = '📋 Copy';
                            }, 2000);
                        }
                    });

                    header.appendChild(copyButton);
                    codeBlock.parentElement.insertBefore(header, codeBlock);
                });

                if (comments.length === limit) {
                    const readMoreButton = document.createElement('button');
                    readMoreButton.textContent = 'Read more ▼';
                    readMoreButton.classList.add('read-more');
                    readMoreButton.addEventListener('click', () => {
                        offset += limit;
                        loadComments();
                        readMoreButton.remove();
                    });
                    commentsList.appendChild(readMoreButton);
                }
            } else if (offset === 0) {
                commentsList.innerHTML = '<p class="no-comments">No comments yet</p>';
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            commentsList.innerHTML = '<p class="error">Failed to load comments</p>';
        }
    }

    // Load initial comments
    loadComments();

    // Handle comment form submission if form exists (user is logged in)
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';

            try {
                const content = document.getElementById('comment-content').value;
                
                const response = await fetch('/api/comments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': await getCsrfToken()
                    },
                    body: JSON.stringify({
                        post_id: postId,
                        content: content
                    }),
                    credentials: 'include'
                });

                if (response.ok) {
                    document.getElementById('comment-content').value = '';
                    commentsList.innerHTML = ''; // Clear comments list
                    offset = 0; // Reset offset
                    loadComments(); // Reload comments
                } else {
                    const data = await response.json();
                    alert(data.message || 'Failed to post comment');
                }
            } catch (error) {
                console.error('Error posting comment:', error);
                alert('Failed to post comment');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post Comment';
            }
        });
    }

    // Copy button functionality
    document.querySelectorAll('pre code').forEach((codeBlock) => {
        // Create wrapper for the copy button
        const header = document.createElement('div');
        header.className = 'code-block-header';

        // Create copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '📋 Copy';
        
        // Add click handler
        copyButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(codeBlock.textContent);
                copyButton.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    copyButton.innerHTML = '📋 Copy';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                copyButton.innerHTML = '❌ Error!';
                setTimeout(() => {
                    copyButton.innerHTML = '📋 Copy';
                }, 2000);
            }
        });

        // Add button to header and header to pre element
        header.appendChild(copyButton);
        codeBlock.parentElement.insertBefore(header, codeBlock);
    });
});
