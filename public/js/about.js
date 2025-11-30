/*
  Nazarban Analytics - About Page JavaScript
  Handles:
  - Loading about video URL from API
  - Converting video URLs to embed format (YouTube, Vimeo, Aparat, Arvan Cloud)
  - Displaying video player
*/

document.addEventListener('DOMContentLoaded', async () => {
  const videoSection = document.getElementById('aboutVideoSection');

  // Get current language
  const getCurrentLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'fa';
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

    // Arvan Cloud VOD
    // Supports formats like: https://example.arvanvod.ir/abcd1234/origin.mp4
    // or https://example.arvanvod.ir/abcd1234/master.m3u8
    const arvanMatch = url.match(/https?:\/\/([^\/]+\.arvanvod\.ir\/[^\/]+\/[^\/]+)/);
    if (arvanMatch) {
      // For Arvan Cloud, we'll use the direct URL with HTML5 video player
      return url;
    }

    // If already an embed URL or direct video URL, return as is
    if (url.includes('embed') || url.match(/\.(mp4|webm|ogg|m3u8)$/i)) {
      return url;
    }

    return null;
  };

  // Check if URL is a direct video file (for HTML5 video player)
  const isDirectVideo = (url) => {
    return url && (url.includes('arvanvod.ir') || url.match(/\.(mp4|webm|ogg|m3u8)$/i));
  };

  // Load about video
  const loadAboutVideo = async () => {
    try {
      const response = await fetch('/api/about/video');
      const data = await response.json();

      if (data.success && data.videoUrl) {
        const lang = getCurrentLanguage();

        // Support both old string format and new multilingual object format
        let videoUrl;
        if (typeof data.videoUrl === 'string') {
          videoUrl = data.videoUrl;
        } else if (data.videoUrl && typeof data.videoUrl === 'object') {
          videoUrl = data.videoUrl[lang] || data.videoUrl.en || data.videoUrl.fa || '';
        }

        const embedUrl = getEmbedUrl(videoUrl);

        if (embedUrl) {
          displayVideo(embedUrl);
        }
      }
    } catch (error) {
      console.error('Error loading about video:', error);
      // Silently fail - if no video, just don't show the section
    }
  };

  // Display video player
  const displayVideo = (embedUrl) => {
    const lang = getCurrentLanguage();
    const videoTitle = lang === 'fa' ? 'ویدیوی معرفی نظربان' : 'Nazarban Introduction Video';

    let videoPlayerHTML;

    if (isDirectVideo(embedUrl)) {
      // Use HTML5 video player for direct video files (Arvan Cloud, mp4, etc.)
      videoPlayerHTML = `
        <h3>${videoTitle}</h3>
        <div class="video-container">
          <video controls controlsList="nodownload" style="width: 100%; height: 100%; border-radius: 12px;">
            <source src="${embedUrl}" type="${embedUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'}">
            ${lang === 'fa' ? 'مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.' : 'Your browser does not support the video tag.'}
          </video>
        </div>
      `;
    } else {
      // Use iframe for embed URLs (YouTube, Vimeo, Aparat)
      videoPlayerHTML = `
        <h3>${videoTitle}</h3>
        <div class="video-container">
          <iframe
            src="${embedUrl}"
            title="${videoTitle}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            style="border-radius: 12px;">
          </iframe>
        </div>
      `;
    }

    videoSection.innerHTML = videoPlayerHTML;
    videoSection.style.display = 'block';
  };

  // Load video on page load
  await loadAboutVideo();

  // Reload video on language change
  const handleLanguageChange = () => {
    loadAboutVideo();
  };

  window.addEventListener('storage', (e) => {
    if (e.key === 'preferredLanguage') {
      handleLanguageChange();
    }
  });

  document.addEventListener('languageChanged', handleLanguageChange);
});
