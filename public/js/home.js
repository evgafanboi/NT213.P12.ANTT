// Get name from cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Function to check if the user is logged in
function checkLoginStatus() {
    const userId = getCookie('userId'); // Get the userId cookie
    const usernameDiv = document.querySelector('.username');

    if (userId) {
        // User is logged in, update the username div
        usernameDiv.innerHTML = `<p class="logout-redirect">Logout</p>`;
        // Register a logout functionality for the element
        usernameDiv.querySelector('.logout-redirect').addEventListener('click', function() {
            // Logout logic
            alert('You will be logged out. (still in work)');
        });
    } else {
        // User is not logged in, show login link
        usernameDiv.innerHTML = `<a href="/login"><p class="login-redirect">login</p></a>`;
    }
}

// Call the function on page load
window.onload = checkLoginStatus;
