function initUI() {
    // Collapsible Sections Logic
    const headers = document.querySelectorAll('.section-header');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.form-section');
            if (section) {
                section.classList.toggle('section-collapsed');
            }
        });
    });

    // API Key Indicator Logic
    const apiKeyInput = document.getElementById('api-key');
    const apiKeyIndicator = document.getElementById('api-key-indicator');

    if (apiKeyInput && apiKeyIndicator) {
        // Check initial state
        if (apiKeyInput.value.trim() || localStorage.getItem('gemini_api_key')) {
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
    initTiltEffect();

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

function initTiltEffect() {
    const container = document.querySelector('.canvas-container');
    const canvas = document.getElementById('card-canvas');

    if (!container || !canvas) return;

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate rotation (max 10 degrees)
        const xRotation = -((y - rect.height / 2) / rect.height * 20);
        const yRotation = (x - rect.width / 2) / rect.width * 20;

        canvas.style.transform = `rotateX(${xRotation}deg) rotateY(${yRotation}deg) scale(1.02)`;
    });

    container.addEventListener('mouseleave', () => {
        canvas.style.transform = 'rotateX(0) rotateY(0) scale(1)';
    });
}

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
    let maxZIndex = 100;

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

    // Drag Logic
    windows.forEach(win => {
        const header = win.querySelector('.window-header');
        if (!header) return;

        // Bring to front on click
        win.addEventListener('mousedown', () => {
            maxZIndex++;
            win.style.zIndex = maxZIndex;
        });

        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header || header.contains(e.target)) {
                // Ignore close button
                if (e.target.closest('.window-close-btn')) return;
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, win);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    });
}
