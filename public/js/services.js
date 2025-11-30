/*
  Nazarban Analytics - Services Page JavaScript
  Handles:
  - Clickable service headings with video modal
  - Loading service videos from API
  - Converting video URLs to embed format (YouTube, Vimeo, Aparat, Arvan Cloud)
*/

document.addEventListener('DOMContentLoaded', async () => {
  const modal = document.getElementById('serviceVideoModal');
  const overlay = document.querySelector('.service-video-overlay');
  const closeBtn = document.querySelector('.service-video-close');
  const videoPlayer = document.getElementById('serviceVideoPlayer');
  const clickableHeadings = document.querySelectorAll('.service-heading-clickable');

  let servicesVideos = {};

  // Load service videos from API
  const loadServiceVideos = async () => {
    try {
      const response = await fetch('/api/services/videos');
      const data = await response.json();

      if (data.success && data.videos) {
        servicesVideos = data.videos;
        console.log('✅ Service videos loaded:', servicesVideos);
      }
    } catch (error) {
      console.error('Error loading service videos:', error);
    }
  };

  // Convert YouTube/Vimeo/Aparat/Arvan Cloud URL to embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;

    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Aparat (Iranian video platform)
    const aparatMatch = url.match(/aparat\.com\/v\/([a-zA-Z0-9]+)/);
    if (aparatMatch) {
      return `https://www.aparat.com/video/video/embed/videohash/${aparatMatch[1]}/vt/frame`;
    }

    // Arvan Cloud VOD or direct video
    const arvanMatch = url.match(/https?:\/\/([^\/]+\.arvanvod\.ir\/[^\/]+\/[^\/]+)/);
    if (arvanMatch || url.match(/\.(mp4|webm|ogg|m3u8)$/i)) {
      return url;
    }

    // If already an embed URL
    if (url.includes('embed')) {
      return url;
    }

    return null;
  };

  // Check if URL is a direct video file (for HTML5 video player)
  const isDirectVideo = (url) => {
    return url && (url.includes('arvanvod.ir') || url.match(/\.(mp4|webm|ogg|m3u8)$/i));
  };

  // Get current language
  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'fa';
  };

  // Open modal with video
  const openModal = (serviceId) => {
    const videoData = servicesVideos[serviceId];

    if (!videoData) {
      console.log(`No video configured for service: ${serviceId}`);
      return;
    }

    const lang = getCurrentLanguage();

    // Support both old string format and new multilingual object format
    let videoUrl;
    if (typeof videoData === 'string') {
      videoUrl = videoData;
    } else if (videoData && typeof videoData === 'object') {
      videoUrl = videoData[lang] || videoData.en || videoData.fa || '';
    }

    if (!videoUrl) {
      console.log(`No video URL for service: ${serviceId} in language: ${lang}`);
      return;
    }

    const embedUrl = getEmbedUrl(videoUrl);

    if (!embedUrl) {
      console.error('Invalid video URL format');
      return;
    }

    let videoHTML;

    if (isDirectVideo(embedUrl)) {
      // Use HTML5 video player for direct video files (Arvan Cloud, mp4, etc.)
      videoHTML = `
        <video controls controlsList="nodownload" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;">
          <source src="${embedUrl}" type="${embedUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'}">
          Your browser does not support the video tag.
        </video>
      `;
    } else {
      // Use iframe for embed URLs (YouTube, Vimeo, Aparat)
      videoHTML = `
        <iframe
          src="${embedUrl}"
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      `;
    }

    videoPlayer.innerHTML = videoHTML;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  };

  // Close modal
  const closeModal = () => {
    modal.style.display = 'none';
    videoPlayer.innerHTML = ''; // Stop video playback
    document.body.style.overflow = ''; // Restore scrolling
  };

  // Add click event listeners to headings
  clickableHeadings.forEach(heading => {
    heading.addEventListener('click', () => {
      const serviceId = heading.getAttribute('data-service-id');
      openModal(serviceId);
    });

    // Add keyboard accessibility
    heading.setAttribute('tabindex', '0');
    heading.setAttribute('role', 'button');

    heading.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const serviceId = heading.getAttribute('data-service-id');
        openModal(serviceId);
      }
    });
  });

  // Close modal events
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeModal();
    }
  });

  // Load videos on page load
  await loadServiceVideos();
});
