// Whitepaper Page Custom Content Loader
// This script loads custom content from the admin panel and overrides default translations

(async function() {
    try {
        const response = await fetch('/api/content/whitepaper');
        const data = await response.json();

        if (data.success && data.content) {
            const content = data.content;

            // Override translations with custom content if provided
            if (window.translations) {
                // English overrides
                if (content.en) {
                    if (content.en.mainTitle) window.translations.en.whitepaper_main_title = content.en.mainTitle;
                    if (content.en.visionTitle) window.translations.en.whitepaper_vision_title = content.en.visionTitle;
                    if (content.en.visionText) window.translations.en.whitepaper_vision_text = content.en.visionText;
                    if (content.en.whynowTitle) window.translations.en.whitepaper_whynow_title = content.en.whynowTitle;
                    if (content.en.whynowText) window.translations.en.whitepaper_whynow_text = content.en.whynowText;
                    if (content.en.ctaTitle) window.translations.en.whitepaper_cta_title = content.en.ctaTitle;
                    if (content.en.ctaText) window.translations.en.whitepaper_cta_text = content.en.ctaText;
                }

                // Persian overrides
                if (content.fa) {
                    if (content.fa.mainTitle) window.translations.fa.whitepaper_main_title = content.fa.mainTitle;
                    if (content.fa.visionTitle) window.translations.fa.whitepaper_vision_title = content.fa.visionTitle;
                    if (content.fa.visionText) window.translations.fa.whitepaper_vision_text = content.fa.visionText;
                    if (content.fa.whynowTitle) window.translations.fa.whitepaper_whynow_title = content.fa.whynowTitle;
                    if (content.fa.whynowText) window.translations.fa.whitepaper_whynow_text = content.fa.whynowText;
                    if (content.fa.ctaTitle) window.translations.fa.whitepaper_cta_title = content.fa.ctaTitle;
                    if (content.fa.ctaText) window.translations.fa.whitepaper_cta_text = content.fa.ctaText;
                }

                // Re-apply translations with custom content
                if (window.updateContent) {
                    window.updateContent();
                }
            }
        }
    } catch (error) {
        console.error('Error loading whitepaper custom content:', error);
    }
})();
