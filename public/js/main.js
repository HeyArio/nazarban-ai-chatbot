document.addEventListener('DOMContentLoaded', () => {
  const mainNav = document.getElementById('main-nav');
  const menuToggle = document.getElementById('menu-toggle');

  if (menuToggle) {
    // Handle mobile menu toggle
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('mobile-open');
      const icon = menuToggle.querySelector('.menu-toggle-icon');
      if (isOpen) {
        // "X" icon
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />';
      } else {
        // "Hamburger" icon
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />';
      }
    });
  }
});

