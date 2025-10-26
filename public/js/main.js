/*
  Nazarban Analytics - Site-wide JavaScript
  Handles:
  - Mobile Menu Toggle
*/

document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  // FIX: Target the mobile overlay UL specifically
  const mobileNavOverlay = document.querySelector('.nav-mobile-overlay'); 

  if (menuToggle && mobileNavOverlay) {
    menuToggle.addEventListener('click', () => {
      // Toggle the 'active' class on the overlay to show/hide
      mobileNavOverlay.classList.toggle('active');
      
      // Toggle the 'active' class on the button for the 'X' animation
      menuToggle.classList.toggle('active');

      // Toggle ARIA attribute for accessibility
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !isExpanded);

      // Prevent body scrolling when menu is open
      if (mobileNavOverlay.classList.contains('active')) {
        document.body.style.overflow = 'hidden'; // Prevent scroll
      } else {
        document.body.style.overflow = ''; // Allow scroll
      }
    });

    // Close menu when a link inside the overlay is clicked
    mobileNavOverlay.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        // Only run if the menu is actually active (visible)
        if (mobileNavOverlay.classList.contains('active')) {
          mobileNavOverlay.classList.remove('active');
          menuToggle.classList.remove('active'); // Turn X back to hamburger
          menuToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = ''; // Re-enable scrolling
        }
      });
    });
  }
});

