function initUI() {
    // Collapsible Sections Logic - REMOVED (Replaced by NavigationManager)


    // API Key Indicator Logic
    const apiKeyInput = document.getElementById('api-key');
    const apiKeyIndicator = document.getElementById('api-key-indicator');

    if (apiKeyInput && apiKeyIndicator) {
        // Check initial state
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            apiKeyInput.value = savedKey;
            apiKeyIndicator.classList.add('active');
        } else if (apiKeyInput.value.trim()) {
            apiKeyIndicator.classList.add('active');
        }

        apiKeyInput.addEventListener('input', () => {
            if (apiKeyInput.value.trim()) {
                apiKeyIndicator.classList.add('active');
            } else {
                apiKeyIndicator.classList.remove('active');
            }
        });
    }

    // Initialize Tilt Effect
    // initTiltEffect(); // Removed per user request

    // Initialize Slider Bubbles
    initSliderBubbles();
}

function initSliderBubbles() {
    const sliders = document.querySelectorAll('input[type="range"]');

    sliders.forEach(slider => {
        const parent = slider.parentElement;
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }

        const bubble = document.createElement('div');
        bubble.className = 'slider-bubble';
        parent.appendChild(bubble);

        const updateBubble = () => {
            const val = parseFloat(slider.value);
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const percent = (val - min) / (max - min);

            // Calculate position relative to the input width
            // We need to account for the thumb width (~16px)
            const thumbWidth = 16;
            const width = slider.offsetWidth - thumbWidth;
            const left = slider.offsetLeft + (thumbWidth / 2) + (percent * width);

            bubble.style.left = `${left}px`;
            bubble.textContent = val;
        };

        slider.addEventListener('input', () => {
            updateBubble();
            bubble.classList.add('visible');
        });

        slider.addEventListener('mousedown', () => bubble.classList.add('visible'));
        slider.addEventListener('touchstart', () => bubble.classList.add('visible'));

        slider.addEventListener('mouseup', () => bubble.classList.remove('visible'));
        slider.addEventListener('touchend', () => bubble.classList.remove('visible'));
        slider.addEventListener('blur', () => bubble.classList.remove('visible'));

        // Initial update
        // Use setTimeout to ensure layout is ready
        setTimeout(updateBubble, 100);
        window.addEventListener('resize', updateBubble);
    });
}

/* 
function initTiltEffect() {
    // Removed per user request
} 
*/

function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Remove after duration
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-in forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        });
    }, duration);
}

// --- Window Management (Desktop Workbench) ---
function initWindowManager() {
    const windows = document.querySelectorAll('.floating-window');
    const toolbarBtns = document.querySelectorAll('.toolbar-btn[data-target]');
    const closeBtns = document.querySelectorAll('.window-close-btn');
    let maxZIndex = 700; // Start above nav (500) and scroll menus (600)

    // Open Window
    toolbarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const targetWindow = document.getElementById(targetId);

            if (targetWindow) {
                targetWindow.classList.remove('hidden');
                targetWindow.style.visibility = 'visible';

                // Bring to front
                maxZIndex++;
                targetWindow.style.zIndex = maxZIndex;
            }
        });
    });

    // Close Window
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const targetWindow = document.getElementById(targetId);

            if (targetWindow) {
                targetWindow.classList.add('hidden');
                // Wait for transition to finish before hiding visibility (optional, handled by CSS)
            }
        });
    });

    // Drag Logic - DISABLED per user request
    // Windows are now fixed in center and cannot be dragged
    windows.forEach(win => {
        const header = win.querySelector('.window-header');
        if (header) {
            header.style.cursor = 'default'; // Remove grab cursor
        }
    });
}

// ================================================
// Form Header Updates (Collapsible Accordion)
// ================================================

function initFormHeaderUpdates() {
    const updates = [
        {
            input: 'item-level',
            display: 'level-display-btn', // Fixed: was 'level-display'
            format: (val) => {
                const el = document.getElementById('item-level');
                if (el && el.selectedIndex >= 0) {
                    const text = el.options[el.selectedIndex].text;
                    // For mundane option, take text before parenthesis
                    // For level ranges (1-4, 5-10, etc.), take first word
                    if (val === 'mundane') {
                        return text.split('(')[0].trim() || text;
                    }
                    return text.split(' ')[0] || val;
                }
                return val;
            }
        },
        {
            input: 'item-type',
            display: 'type-display-btn', // Fixed: was 'type-display'
            format: (val) => {
                const el = document.getElementById('item-type');
                // Take only Hebrew part (before parenthesis)
                return el ? el.options[el.selectedIndex].text.split('(')[0].trim() : val;
            }
        },
        {
            input: 'image-style',
            display: 'style-display-btn',
            format: (val) => {
                // Use i18n to get proper translation
                const key = `imageStyles.${val}`;
                const translated = window.i18n?.t(key);
                // Return translated value, or extract Hebrew from option if i18n not ready
                if (translated && translated !== key) {
                    return translated.split('(')[0].trim();
                }
                const el = document.getElementById('image-style');
                return el ? el.options[el.selectedIndex].text.split('(')[0].trim() : val;
            }
        },
        {
            input: 'item-ability',
            display: 'ability-display',
            format: (val) => val || '???'
        },
        {
            input: 'api-key',
            display: 'api-key-display',
            format: (val) => val ? '✓ הוזן' : 'לא הוזן'
        }
    ];

    updates.forEach(({ input, display, format }) => {
        const inputEl = document.getElementById(input);
        const displayEl = document.getElementById(display);

        if (inputEl && displayEl) {
            const update = () => {
                displayEl.textContent = format(inputEl.value);
            };
            inputEl.addEventListener('input', update);
            inputEl.addEventListener('change', update);
            update(); // Initial update
        }
    });

    // Special case for Visuals (combines two inputs)
    const modelInput = document.getElementById('image-model');
    const styleInput = document.getElementById('image-style');
    const visualsDisplay = document.getElementById('visuals-display');
    const styleOptionInput = document.getElementById('image-style-option');

    if (modelInput && styleInput && visualsDisplay) {
        const updateVisuals = () => {
            const model = modelInput.options[modelInput.selectedIndex].text.split('(')[0].trim();
            const style = styleInput.options[styleInput.selectedIndex].text.split('(')[0].trim();
            visualsDisplay.textContent = `${model} / ${style}`;

            // Save style preference to localStorage for Treasure Generator to use
            localStorage.setItem('preferred_image_style', styleInput.value);
        };
        modelInput.addEventListener('change', updateVisuals);
        styleInput.addEventListener('change', updateVisuals);
        updateVisuals();
    }

    // Save style option to localStorage when it changes
    if (styleOptionInput) {
        styleOptionInput.addEventListener('change', () => {
            localStorage.setItem('preferred_style_option', styleOptionInput.value);
        });
        // Initialize with current value
        if (styleOptionInput.value) {
            localStorage.setItem('preferred_style_option', styleOptionInput.value);
        }
    }
}

// ================================================
// Mobile Sidebar Toggle
// ================================================

function initMobileSidebar() {
    const overlay = document.getElementById('mobile-overlay');
    const menuStartBtn = document.getElementById('mobile-menu-start');
    const menuEndBtn = document.getElementById('mobile-menu-end');
    const menuGalleryBtn = document.getElementById('mobile-menu-gallery');
    const sidebarStart = document.querySelector('.sidebar-start');
    const sidebarEnd = document.querySelector('.sidebar-end');

    function openSidebar(sidebar) {
        if (!sidebar) return;
        sidebar.classList.add('open');
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeAllSidebars() {
        sidebarStart?.classList.remove('open');
        sidebarEnd?.classList.remove('open');
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Menu buttons
    menuStartBtn?.addEventListener('click', () => openSidebar(sidebarStart));
    menuEndBtn?.addEventListener('click', () => openSidebar(sidebarEnd));

    // Gallery button - open gallery tab
    menuGalleryBtn?.addEventListener('click', () => {
        const galleryTab = document.querySelector('#gallery-placeholder, [data-tab="gallery"]');
        if (galleryTab) {
            galleryTab.click();
        }
        // Also trigger gallery open if there's a gallery controller
        window.historyController?.openGallery?.();
    });

    // Close on overlay click
    overlay?.addEventListener('click', closeAllSidebars);

    // Close on swipe (basic swipe detection)
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX;

        // RTL: Swipe left to close right sidebar, swipe right to close left sidebar
        if (Math.abs(diff) > 100) {
            if (diff > 0 && sidebarStart?.classList.contains('open')) {
                closeAllSidebars();
            } else if (diff < 0 && sidebarEnd?.classList.contains('open')) {
                closeAllSidebars();
            }
        }
    }, { passive: true });

    // Add close buttons to sidebars dynamically
    [sidebarStart, sidebarEnd].forEach(sidebar => {
        if (sidebar && !sidebar.querySelector('.sidebar-close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'sidebar-close-btn';
            closeBtn.innerHTML = '✕';
            closeBtn.addEventListener('click', closeAllSidebars);
            sidebar.insertBefore(closeBtn, sidebar.firstChild);
        }
    });
}

// Auto-init on componentsLoaded

export { initUI, showToast, initWindowManager, initFormHeaderUpdates, initMobileSidebar };
