document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const toggleButton = document.getElementById('navbar-toggle');
    
    toggleButton.addEventListener('click', () => {
        navbar.classList.toggle('collapsed');
        localStorage.setItem('navbarCollapsed', navbar.classList.contains('collapsed'));
    });
    
    const isCollapsed = localStorage.getItem('navbarCollapsed') === 'true';
    if (isCollapsed) {
        navbar.classList.add('collapsed');
        toggleButton.textContent = '▶';
    }
}); 