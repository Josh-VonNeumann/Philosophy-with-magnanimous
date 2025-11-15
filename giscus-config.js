// Giscus Configuration for Discussion Forum
// Follow the setup instructions in README.md to get your configuration values

// CONFIGURATION REQUIRED: Replace these placeholder values with your actual Giscus settings
// Get these values from https://giscus.app after setting up your GitHub repository

const GISCUS_CONFIG = {
    repo: "YOUR-USERNAME/YOUR-REPO",           // e.g., "johndoe/philosophical-discussions"
    repoId: "YOUR-REPO-ID",                     // Get from giscus.app
    category: "General",                         // GitHub Discussions category name
    categoryId: "YOUR-CATEGORY-ID",             // Get from giscus.app
    mapping: "specific",                        // Use specific discussions
    strict: "0",
    reactionsEnabled: "1",
    emitMetadata: "0",
    inputPosition: "bottom",
    theme: "light",
    lang: "en"
};

// Initialize Giscus for each discussion
function initializeGiscus() {
    const giscusContainers = document.querySelectorAll('.giscus');

    giscusContainers.forEach(container => {
        const discussionTitle = container.getAttribute('data-discussion-title');

        const script = document.createElement('script');
        script.src = 'https://giscus.app/client.js';
        script.setAttribute('data-repo', GISCUS_CONFIG.repo);
        script.setAttribute('data-repo-id', GISCUS_CONFIG.repoId);
        script.setAttribute('data-category', GISCUS_CONFIG.category);
        script.setAttribute('data-category-id', GISCUS_CONFIG.categoryId);
        script.setAttribute('data-mapping', GISCUS_CONFIG.mapping);
        script.setAttribute('data-term', discussionTitle);
        script.setAttribute('data-strict', GISCUS_CONFIG.strict);
        script.setAttribute('data-reactions-enabled', GISCUS_CONFIG.reactionsEnabled);
        script.setAttribute('data-emit-metadata', GISCUS_CONFIG.emitMetadata);
        script.setAttribute('data-input-position', GISCUS_CONFIG.inputPosition);
        script.setAttribute('data-theme', GISCUS_CONFIG.theme);
        script.setAttribute('data-lang', GISCUS_CONFIG.lang);
        script.setAttribute('crossorigin', 'anonymous');
        script.async = true;

        container.appendChild(script);
    });
}

// Only initialize if configuration is set
if (GISCUS_CONFIG.repo !== "YOUR-USERNAME/YOUR-REPO") {
    document.addEventListener('DOMContentLoaded', initializeGiscus);
} else {
    // Show setup message if not configured
    document.addEventListener('DOMContentLoaded', function() {
        const giscusContainers = document.querySelectorAll('.giscus');
        giscusContainers.forEach(container => {
            container.innerHTML = `
                <div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; margin-top: 20px;">
                    <strong>Discussion forum not yet configured</strong>
                    <p style="margin: 10px 0 0 0; font-size: 0.9rem;">
                        Please follow the setup instructions in README.md to enable comments and discussions.
                    </p>
                </div>
            `;
        });
    });
}
