// Add this at the top level to store the user's email
let userEmail;

// Fetch user email when the page loads
async function initializeUserData() {
    try {
        const response = await fetch('/auth/profile');
        const userData = await response.json();
        userEmail = userData.email; // Store email globally
    } catch (error) {
        console.error('Failed to fetch user data:', error);
    }
}

async function getCsrfToken() {
    const response = await fetch('/csrf-token');
    const { token } = await response.json();
    return token;
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeUserData();
    const editBtn = document.querySelector('.edit-username-btn');
    const usernameDisplay = document.getElementById('username-display');
    const usernameContainer = document.querySelector('.username-container');
    const deletePostBtns = document.querySelectorAll('.delete-post-btn');

    // Logic for edit username
    editBtn.addEventListener('click', () => {
        const currentUsername = usernameDisplay.textContent;
        
        // Create edit form
        const form = document.createElement('form');
        form.className = 'username-edit-form';
        form.innerHTML = `
            <input type="text" value="${currentUsername}" maxlength="30" required>
            <button type="submit">Save</button>
            <button type="button" class="cancel-btn">Cancel</button>
        `;

        // Hide current display
        usernameDisplay.style.display = 'none';
        editBtn.style.display = 'none';

        // Add form
        usernameContainer.insertBefore(form, editBtn);

        // Focus input
        const input = form.querySelector('input');
        input.focus();
        input.select();

        // Handle cancel
        form.querySelector('.cancel-btn').addEventListener('click', () => {
            form.remove();
            usernameDisplay.style.display = 'inline';
            editBtn.style.display = 'inline';
        });

        // Handle submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = input.value.trim();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            if (newUsername === currentUsername) {
                form.remove();
                usernameDisplay.style.display = 'inline';
                editBtn.style.display = 'inline';
                return;
            }

            try {
                const csrfToken = await getCsrfToken();
                const response = await fetch('/auth/update-username', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({ username: newUsername }),
                    credentials: 'include'
                });

                const data = await response.json();

                if (response.ok) {
                    usernameDisplay.textContent = newUsername;
                    form.remove();
                    usernameDisplay.style.display = 'inline';
                    editBtn.style.display = 'inline';
                    alert('Username updated successfully');
                } else {
                    alert(data.message || 'Failed to update username');
                }
            } catch (error) {
                console.error('Error updating username:', error);
                alert('Failed to update username');
            }
        });
    });

    deletePostBtns.forEach(deleteBtn => {
        deleteBtn.addEventListener('click', async function(e) {
            e.stopPropagation();
            this.disabled = true;
            this.textContent = 'Deleting...';
            const postArticle = this.closest('.post-preview');
            const postId = this.getAttribute('data-post-id');

            const csrfToken = await getCsrfToken();
            
            // Simple confirmation
            if (!confirm('Are you sure you want to delete this post?')) {
                return;
            }

            // Delete post
            fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'x-csrf-token': csrfToken
                },
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Post deleted successfully') {
                    // Animate removal
                    postArticle.style.opacity = '0';
                    setTimeout(() => {
                        postArticle.remove();
                        // If no posts left, show "No posts" message
                        const postsContainer = document.querySelector('.user-posts');
                        if (!postsContainer.querySelector('.post-preview')) {
                            postsContainer.innerHTML = '<p class="no-posts">No posts yet</p>';
                        }
                    }, 300);
                } else {
                    alert(data.message || 'Failed to delete post');
                }
            })
            .catch(error => {
                console.error('Error deleting post:', error);
                alert('Failed to delete post');
            });

            if (!error) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = 'Delete';
            }
        });
    });

    // Edit post functionality
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editPostId = document.getElementById('edit-post-id');
    const editTitle = document.getElementById('edit-title');
    const editContent = document.getElementById('edit-content');

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });

    // Close button functionality
    editModal.querySelector('.close').addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    // Edit button click handlers
    document.querySelectorAll('.edit-post-btn').forEach(editBtn => {
        editBtn.addEventListener('click', async function() {
            const postId = this.getAttribute('data-post-id');
            editPostId.value = postId;
            
            try {
                // Use the new endpoint for raw content
                const response = await fetch(`/api/posts/${postId}/raw`, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const post = await response.json();
                    editTitle.value = post.title;
                    editContent.value = post.content; // Raw content
                    editModal.style.display = 'block';
                } else {
                    throw new Error('Failed to fetch post content');
                }
            } catch (error) {
                console.error('Error fetching post:', error);
                alert('Failed to load post content');
            }
        });
    });

    // Handle edit form submission
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        const postId = editPostId.value;
        
        try {
            const csrfToken = await getCsrfToken();
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken
                },
                body: JSON.stringify({
                    title: editTitle.value,
                    content: editContent.value
                }),
                credentials: 'include'
            });

            const data = await response.json();
            
            if (response.ok) {
                // Update post in the UI
                const postArticle = document.querySelector(`.edit-post-btn[data-post-id="${postId}"]`).closest('.post-preview');
                postArticle.querySelector('h3').textContent = editTitle.value;
                postArticle.querySelector('.post-content-preview').innerHTML = editContent.value;
                
                // Close modal
                editModal.style.display = 'none';
                
                // Optional: Show success message
                alert('Post updated successfully');
            } else {
                alert(data.message || 'Failed to update post');
            }
        } catch (error) {
            console.error('Error updating post:', error);
            alert('Failed to update post');
        }
    });

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Comment management functionality
    function attachCommentEventListeners() {
        // Delete comment handlers
        document.querySelectorAll('.delete-comment-btn').forEach(deleteBtn => {
            deleteBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const commentId = this.getAttribute('data-comment-id');
                const commentArticle = this.closest('.comment-preview');
                
                if (!confirm('Are you sure you want to delete this comment?')) {
                    return;
                }

                try {
                    const csrfToken = await getCsrfToken();
                    const response = await fetch(`/api/comments/${commentId}`, {
                        method: 'DELETE',
                        headers: {
                            'x-csrf-token': csrfToken
                        },
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        commentArticle.style.opacity = '0';
                        setTimeout(() => {
                            commentArticle.remove();
                            // Check if no comments left
                            const commentsContainer = document.querySelector('#comments');
                            if (!commentsContainer.querySelector('.comment-preview')) {
                                commentsContainer.innerHTML = '<p class="no-comments">No comments yet</p>';
                            }
                        }, 300);
                    } else {
                        alert('Failed to delete comment');
                    }
                } catch (error) {
                    console.error('Error deleting comment:', error);
                    alert('Failed to delete comment');
                }
            });
        });

        // Edit comment handlers
        const editCommentModal = document.getElementById('edit-comment-modal');
        const editCommentForm = document.getElementById('edit-comment-form');
        const editCommentId = document.getElementById('edit-comment-id');
        const editCommentContent = document.getElementById('edit-comment-content');

        document.querySelectorAll('.edit-comment-btn').forEach(editBtn => {
            editBtn.addEventListener('click', function() {
                const commentId = this.getAttribute('data-comment-id');
                const rawContent = decodeURIComponent(this.getAttribute('data-raw-content'));
                
                editCommentId.value = commentId;
                editCommentContent.value = rawContent;
                editCommentModal.style.display = 'block';
            });
        });

        // Close comment modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === editCommentModal) {
                editCommentModal.style.display = 'none';
            }
        });

        // Close button functionality for comment modal
        editCommentModal.querySelector('.close').addEventListener('click', () => {
            editCommentModal.style.display = 'none';
        });

        // Handle comment edit form submission
        editCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
            
            const commentId = editCommentId.value;
            
            try {
                const csrfToken = await getCsrfToken();
                const response = await fetch(`/api/comments/${commentId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({
                        content: editCommentContent.value
                    }),
                    credentials: 'include'
                });

                if (response.ok) {
                    // Reload comments to show updated content
                    await loadUserComments();
                    editCommentModal.style.display = 'none';
                    alert('Comment updated successfully');
                } else {
                    const data = await response.json();
                    alert(data.message || 'Failed to update comment');
                }
            } catch (error) {
                console.error('Error updating comment:', error);
                alert('Failed to update comment');
            }
        });
    }

    // Update loadUserComments to attach event listeners after loading content
    async function loadUserComments() {
        const commentsContainer = document.querySelector('#comments');
        
        try {
            const response = await fetch('/api/comments/user', {
                credentials: 'include'
            });
            const comments = await response.json();
            
            if (comments.length > 0) {
                commentsContainer.innerHTML = comments.map(comment => `
                    <article class="comment-preview">
                        <div class="comment-content-preview">
                            ${comment.content}
                        </div>
                        <div class="comment-meta">
                            <a href="/post/${comment.post_id}" class="comment-post-link">
                                On: ${comment.post_title}
                            </a>
                            <span class="comment-date">
                                ${new Date(comment.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div class="comment-actions">
                            <button class="edit-comment-btn" 
                                    data-comment-id="${comment.id}"
                                    data-raw-content="${encodeURIComponent(comment.raw_content)}">
                                ✏️ Edit
                            </button>
                            <button class="delete-comment-btn" data-comment-id="${comment.id}">
                                ❌ Delete
                            </button>
                        </div>
                    </article>
                `).join('');
            } else {
                commentsContainer.innerHTML = '<p class="no-comments">No comments yet</p>';
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            commentsContainer.innerHTML = '<p class="error">Failed to load comments</p>';
        }

        // After setting innerHTML, attach event listeners
        attachCommentEventListeners();
    }

    // Load comments when switching to comments tab
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Existing tab switching code...
            
            // Load comments when switching to comments tab
            if (button.getAttribute('data-tab') === 'comments') {
                loadUserComments();
            }
        });
    });

    // Initial load if comments tab is active
    if (document.querySelector('.tab-btn[data-tab="comments"]').classList.contains('active')) {
        loadUserComments();
    }

    // Password change form submission
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordForm = document.getElementById('change-password-form');
    const verifyPasswordForm = document.getElementById('verify-password-form');

    // Add button click handler to show modal
    const editPasswordBtn = document.querySelector('.edit-password-btn');
    editPasswordBtn.addEventListener('click', () => {
        changePasswordModal.style.display = 'block';
        changePasswordForm.style.display = 'block';
        verifyPasswordForm.style.display = 'none';
    });

    // Add close button functionality
    const closeBtn = changePasswordModal.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            changePasswordModal.style.display = 'none';
            // Reset forms
            changePasswordForm.reset();
            changePasswordForm.style.display = 'block';
            verifyPasswordForm.style.display = 'none';
        });
    }

    // Password change form submission
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }

        try {
            const response = await fetch('/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': await getCsrfToken()
                },
                body: JSON.stringify({ 
                    currentPassword, 
                    newPassword 
                }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok && data.require2FA) {
                changePasswordForm.style.display = 'none';
                verifyPasswordForm.style.display = 'block';
            } else if (response.ok) {
                alert('Profile updated successfully');
                changePasswordModal.style.display = 'none';
                changePasswordForm.reset();
            } else {
                alert(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to process request');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
        }
    });

    // Add verification form handler
    verifyPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        const code = document.getElementById('verification-code').value;

        try {
            const response = await fetch('/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': await getCsrfToken()
                },
                body: JSON.stringify({
                    email: userEmail,
                    code: code,
                    type: 'profile-update'
                }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                alert('Password changed successfully');
                changePasswordModal.style.display = 'none';
                // Reset forms
                changePasswordForm.reset();
                verifyPasswordForm.reset();
                changePasswordForm.style.display = 'block';
                verifyPasswordForm.style.display = 'none';
            } else {
                alert(data.message || 'Verification failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to verify code');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify';
        }
    });
}); 