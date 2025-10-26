/*
  Nazarban Analytics - Site-wide JavaScript
  Handles:
  - Mobile Menu Toggle
*/

document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      // Toggle the 'active' class on the nav links to show/hide
      navLinks.classList.toggle('active');
      
      // Toggle the 'active' class on the button for the 'X' animation
      menuToggle.classList.toggle('active');

      // Toggle ARIA attribute for accessibility
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !isExpanded);

      // Prevent body scrolling when menu is open
      if (navLinks.classList.contains('active')) {
        // Use a class to prevent scrolling, which is easier to manage
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (navLinks.classList.contains('active')) {
          navLinks.classList.remove('active');
          menuToggle.classList.remove('active');
          menuToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    });
  }
});