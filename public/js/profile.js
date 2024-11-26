document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.querySelector('.edit-username-btn');
    const usernameDisplay = document.getElementById('username-display');
    const usernameContainer = document.querySelector('.username-container');
    const deletePostBtns = document.querySelectorAll('.delete-post');

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

            if (newUsername === currentUsername) {
                form.remove();
                usernameDisplay.style.display = 'inline';
                editBtn.style.display = 'inline';
                return;
            }

            try {
                const response = await fetch('/auth/update-username', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
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
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            const postArticle = this.closest('.post-preview');
            const postId = this.getAttribute('data-post-id');
            
            // Simple confirmation
            if (!confirm('Are you sure you want to delete this post?')) {
                return;
            }

            // Delete post
            fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
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
        });
    });
}); 