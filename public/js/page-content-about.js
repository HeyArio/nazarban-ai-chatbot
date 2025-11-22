// About Page Custom Content Loader
// This script loads custom content from the admin panel and overrides default translations

(async function() {
    try {
        const response = await fetch('/api/content/about');
        const data = await response.json();

        if (data.success && data.content) {
            const content = data.content;

            // Override translations with custom content if provided
            if (window.translations) {
                // English overrides
                if (content.en) {
                    if (content.en.title) window.translations.en.about_title = content.en.title;
                    if (content.en.intro) window.translations.en.about_intro = content.en.intro;
                    if (content.en.missionTitle) window.translations.en.about_mission_title = content.en.missionTitle;
                    if (content.en.missionText) window.translations.en.about_mission_text = content.en.missionText;
                }

                // Persian overrides
                if (content.fa) {
                    if (content.fa.title) window.translations.fa.about_title = content.fa.title;
                    if (content.fa.intro) window.translations.fa.about_intro = content.fa.intro;
                    if (content.fa.missionTitle) window.translations.fa.about_mission_title = content.fa.missionTitle;
                    if (content.fa.missionText) window.translations.fa.about_mission_text = content.fa.missionText;
                }

                // Re-apply translations with custom content
                if (window.updateContent) {
                    window.updateContent();
                }
            }
        }
    } catch (error) {
        console.error('Error loading about custom content:', error);
    }
})();
