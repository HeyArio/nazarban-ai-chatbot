// Services Page Custom Content Loader
// This script loads custom content from the admin panel and overrides default translations

(async function() {
    try {
        const response = await fetch('/api/content/services');
        const data = await response.json();

        if (data.success && data.content) {
            const content = data.content;

            // Override translations with custom content if provided
            if (window.translations) {
                // English overrides
                if (content.en) {
                    if (content.en.title) window.translations.en.services_title = content.en.title;
                    if (content.en.intro) window.translations.en.services_intro = content.en.intro;

                    if (content.en.service1) {
                        if (content.en.service1.title) window.translations.en.services_strategy_title = content.en.service1.title;
                        if (content.en.service1.desc) window.translations.en.services_strategy_desc = content.en.service1.desc;
                        if (content.en.service1.li1) window.translations.en.services_strategy_li1 = content.en.service1.li1;
                        if (content.en.service1.li2) window.translations.en.services_strategy_li2 = content.en.service1.li2;
                        if (content.en.service1.li3) window.translations.en.services_strategy_li3 = content.en.service1.li3;
                    }

                    if (content.en.service2) {
                        if (content.en.service2.title) window.translations.en.services_dev_title = content.en.service2.title;
                        if (content.en.service2.desc) window.translations.en.services_dev_desc = content.en.service2.desc;
                        if (content.en.service2.li1) window.translations.en.services_dev_li1 = content.en.service2.li1;
                        if (content.en.service2.li2) window.translations.en.services_dev_li2 = content.en.service2.li2;
                        if (content.en.service2.li3) window.translations.en.services_dev_li3 = content.en.service2.li3;
                    }

                    if (content.en.service3) {
                        if (content.en.service3.title) window.translations.en.services_auto_title = content.en.service3.title;
                        if (content.en.service3.desc) window.translations.en.services_auto_desc = content.en.service3.desc;
                        if (content.en.service3.li1) window.translations.en.services_auto_li1 = content.en.service3.li1;
                        if (content.en.service3.li2) window.translations.en.services_auto_li2 = content.en.service3.li2;
                        if (content.en.service3.li3) window.translations.en.services_auto_li3 = content.en.service3.li3;
                    }

                    if (content.en.contact) window.translations.en.services_contact = content.en.contact;
                }

                // Persian overrides
                if (content.fa) {
                    if (content.fa.title) window.translations.fa.services_title = content.fa.title;
                    if (content.fa.intro) window.translations.fa.services_intro = content.fa.intro;

                    if (content.fa.service1) {
                        if (content.fa.service1.title) window.translations.fa.services_strategy_title = content.fa.service1.title;
                        if (content.fa.service1.desc) window.translations.fa.services_strategy_desc = content.fa.service1.desc;
                        if (content.fa.service1.li1) window.translations.fa.services_strategy_li1 = content.fa.service1.li1;
                        if (content.fa.service1.li2) window.translations.fa.services_strategy_li2 = content.fa.service1.li2;
                        if (content.fa.service1.li3) window.translations.fa.services_strategy_li3 = content.fa.service1.li3;
                    }

                    if (content.fa.service2) {
                        if (content.fa.service2.title) window.translations.fa.services_dev_title = content.fa.service2.title;
                        if (content.fa.service2.desc) window.translations.fa.services_dev_desc = content.fa.service2.desc;
                        if (content.fa.service2.li1) window.translations.fa.services_dev_li1 = content.fa.service2.li1;
                        if (content.fa.service2.li2) window.translations.fa.services_dev_li2 = content.fa.service2.li2;
                        if (content.fa.service2.li3) window.translations.fa.services_dev_li3 = content.fa.service2.li3;
                    }

                    if (content.fa.service3) {
                        if (content.fa.service3.title) window.translations.fa.services_auto_title = content.fa.service3.title;
                        if (content.fa.service3.desc) window.translations.fa.services_auto_desc = content.fa.service3.desc;
                        if (content.fa.service3.li1) window.translations.fa.services_auto_li1 = content.fa.service3.li1;
                        if (content.fa.service3.li2) window.translations.fa.services_auto_li2 = content.fa.service3.li2;
                        if (content.fa.service3.li3) window.translations.fa.services_auto_li3 = content.fa.service3.li3;
                    }

                    if (content.fa.contact) window.translations.fa.services_contact = content.fa.contact;
                }

                // Re-apply translations with custom content
                if (window.updateContent) {
                    window.updateContent();
                }
            }
        }
    } catch (error) {
        console.error('Error loading services custom content:', error);
    }
})();
