// Toggle section visibility
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const parent = section.closest('.form-section');
        if (parent) {
            parent.classList.toggle('section-collapsed');
        }
    }
}

// API Key indicator
const apiKeyInput = document.getElementById('api-key');
const apiKeyIndicator = document.getElementById('api-key-indicator');

if (apiKeyInput && apiKeyIndicator) {
    // Check if key exists in localStorage
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKeyIndicator.classList.add('active');
    }

    // Update indicator on input
    apiKeyInput.addEventListener('input', () => {
        if (apiKeyInput.value.trim()) {
            apiKeyIndicator.classList.add('active');
        } else {
            apiKeyIndicator.classList.remove('active');
        }
    });
}
