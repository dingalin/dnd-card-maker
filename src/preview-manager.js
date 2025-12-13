/**
 * Preview Manager - Handles fullscreen, zoom, and progress bar functionality
 */

export class PreviewManager {
    constructor() {
        this.zoomLevel = 100;
        this.currentStep = 0;
        // this.init(); // Removed auto-init to allow waiting for DOM
    }

    init() {
        this.setupFullscreen();
        this.setupZoom();
        this.setupKeyboardShortcuts();
    }

    // ==================== Fullscreen ====================

    setupFullscreen() {
        console.log("🔍 Setting up Fullscreen/Zoom interactions...");
        const container = document.querySelector('.canvas-container');

        // Click on container to toggle zoom
        if (container) {
            console.log("✅ Canvas container found. Attaching click listener.");
            container.addEventListener('click', (e) => {
                console.log("🖱️ Canvas container clicked!");
                // Prevent click if we are clicking a button inside (unlikely now, but good practice)
                if (e.target.tagName === 'BUTTON') return;

                if (container.classList.contains('expanded')) {
                    console.log("📉 Closing fullscreen/zoom");
                    this.closeFullscreen();
                } else {
                    console.log("📈 Opening fullscreen/zoom");
                    this.openFullscreen();
                }
            });
        } else {
            console.error("❌ Canvas container NOT found during setup!");
        }

        // Close on Escape key is handled in setupKeyboardShortcuts
    }

    openFullscreen() {
        const container = document.querySelector('.canvas-container');
        if (!container) return;

        // Toggle expanded class
        container.classList.toggle('expanded');

        // Handle backdrop click to close (optional, but good UX)
        if (container.classList.contains('expanded')) {
            // Add one-time click listener to close if clicked again (handled by toggle, but maybe we want specific behavior)
        }
    }

    closeFullscreen() {
        const container = document.querySelector('.canvas-container');
        if (container) {
            container.classList.remove('expanded');
        }
    }

    // ==================== Zoom ====================

    setupZoom() {
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomResetBtn = document.getElementById('zoom-reset-btn');
        const fullscreenContainer = document.querySelector('.fullscreen-canvas-container');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }

        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => this.zoomReset());
        }

        // Mouse wheel zoom
        if (fullscreenContainer) {
            fullscreenContainer.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            }, { passive: false });
        }
    }

    zoomIn() {
        if (this.zoomLevel < 300) {
            this.zoomLevel += 25;
            this.applyZoom();
        }
    }

    zoomOut() {
        if (this.zoomLevel > 25) {
            this.zoomLevel -= 25;
            this.applyZoom();
        }
    }

    zoomReset() {
        this.zoomLevel = 100;
        this.applyZoom();
    }

    applyZoom() {
        const fullscreenCanvas = document.getElementById('fullscreen-canvas');
        if (fullscreenCanvas) {
            fullscreenCanvas.style.transform = `scale(${this.zoomLevel / 100})`;
        }
        this.updateZoomDisplay();
    }

    updateZoomDisplay() {
        const zoomLevelDisplay = document.getElementById('zoom-level');
        if (zoomLevelDisplay) {
            zoomLevelDisplay.textContent = `${this.zoomLevel}%`;
        }
    }

    // ==================== Keyboard Shortcuts ====================

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const container = document.querySelector('.canvas-container');
            const isFullscreen = container && container.classList.contains('expanded');

            // F key to toggle fullscreen
            if (e.key === 'f' || e.key === 'F') {
                if (!isFullscreen) {
                    this.openFullscreen();
                }
            }

            // Escape to close fullscreen
            if (e.key === 'Escape' && isFullscreen) {
                this.closeFullscreen();
            }

            // Plus/Minus for zoom when in fullscreen
            if (isFullscreen) {
                if (e.key === '+' || e.key === '=') {
                    this.zoomIn();
                } else if (e.key === '-') {
                    this.zoomOut();
                } else if (e.key === '0') {
                    this.zoomReset();
                }
            }
        });
    }

    // ==================== Progress Bar ====================

    /**
     * Update progress bar and steps during generation
     * @param {number} step - Current step (1-4)
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} text - Loading text to display
     */
    updateProgress(step, progress, text) {
        const progressBar = document.getElementById('progress-bar');
        const loadingText = document.getElementById('loading-text');
        const steps = document.querySelectorAll('.progress-steps .step');
        const connectors = document.querySelectorAll('.progress-steps .step-connector');

        // Update progress bar
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Update loading text
        if (loadingText && text) {
            loadingText.textContent = text;
        }

        // Update steps
        steps.forEach((stepEl, index) => {
            const stepNum = index + 1;
            stepEl.classList.remove('active', 'completed');

            if (stepNum < step) {
                stepEl.classList.add('completed');
            } else if (stepNum === step) {
                stepEl.classList.add('active');
            }
        });

        // Update connectors
        connectors.forEach((connector, index) => {
            if (index < step - 1) {
                connector.classList.add('filled');
            } else {
                connector.classList.remove('filled');
            }
        });

        this.currentStep = step;
    }

    /**
     * Reset progress bar to initial state
     */
    resetProgress() {
        this.updateProgress(0, 0, window.i18n?.t('preview.loading') || 'Starting...');
        const connectors = document.querySelectorAll('.progress-steps .step-connector');
        connectors.forEach(c => c.classList.remove('filled'));
    }
}

// Create and export singleton
export const previewManager = new PreviewManager();
window.previewManager = previewManager;
