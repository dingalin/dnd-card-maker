/**
 * Background Manager
 * Handles loading, slicing, and selecting ready-made backgrounds from 3x3 grids.
 */

// Detect base path for GitHub Pages or local development
const BASE_PATH = import.meta.env.BASE_URL;

export class BackgroundManager {
    constructor(renderer) {
        this.renderer = renderer;
        // Use BASE_PATH for asset loading
        this.gridImages = [
            BASE_PATH + 'assets/gallery_1.jpeg',
            BASE_PATH + 'assets/gallery_2.jpeg',
            BASE_PATH + 'assets/gallery_3.png',
            BASE_PATH + 'assets/gallery_4.png',
            BASE_PATH + 'assets/gallery_5.jpeg',
            BASE_PATH + 'assets/gallery_6.png',
            BASE_PATH + 'assets/gallery_7.jpeg',
            BASE_PATH + 'assets/gallery_8.jpeg',
            BASE_PATH + 'assets/gallery_9.png'
        ];

        this.modal = document.getElementById('bg-selection-modal');
        this.gridDisplay = document.getElementById('bg-grid-display');
        this.themesContainer = document.getElementById('bg-themes-container');
        this.openBtn = document.getElementById('ready-made-bg-btn');
        this.closeBtn = document.getElementById('close-bg-modal');
        this.cropBtn = document.getElementById('crop-to-frame-btn');
        this.autoTrimBtn = document.getElementById('auto-trim-btn');

        this.init();
    }

    init() {
        console.log('[BGManager] Init - openBtn:', this.openBtn, 'modal:', this.modal);
        if (this.openBtn) {
            this.openBtn.addEventListener('click', () => this.openModal());
            console.log('[BGManager] ✅ Ready-Made button listener attached');
        } else {
            console.warn('[BGManager] ⚠️ ready-made-bg-btn not found!');
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
        }
        if (this.cropBtn) {
            this.cropBtn.addEventListener('click', () => this.cropCurrentBackground());
        }
        if (this.autoTrimBtn) {
            this.autoTrimBtn.addEventListener('click', () => this.autoTrimBackground());
        }

        // Close on click outside
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });
        }

        // Update position on resize
        window.addEventListener('resize', () => {
            if (this.modal && !this.modal.classList.contains('hidden')) {
                this.updateModalPosition();
            }
        });
    }

    /**
     * Open manual crop tool - allows user to select an area to crop and stretch to card size
     */
    async cropCurrentBackground() {
        if (!this.renderer || !this.renderer.template) {
            console.warn('cropCurrentBackground: No template loaded');
            return;
        }

        const template = this.renderer.template;
        if (!template.complete || template.naturalWidth === 0) {
            console.warn('cropCurrentBackground: Template not fully loaded');
            return;
        }

        // Open the manual crop modal
        this.openCropModal(template);
    }

    /**
     * Auto-trim background - uses brightness detection to remove dark margins automatically
     */
    async autoTrimBackground() {
        if (!this.renderer || !this.renderer.template) {
            console.warn('autoTrimBackground: No template loaded');
            if (window.uiManager) {
                window.uiManager.showToast('אין רקע לקיצוץ', 'warning');
            }
            return;
        }

        const template = this.renderer.template;
        if (!template.complete || template.naturalWidth === 0) {
            console.warn('autoTrimBackground: Template not fully loaded');
            return;
        }

        // Create a canvas from current template
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = template.naturalWidth || 750;
        sourceCanvas.height = template.naturalHeight || 1050;
        const ctx = sourceCanvas.getContext('2d');
        ctx.drawImage(template, 0, 0, sourceCanvas.width, sourceCanvas.height);

        // Apply auto-crop using brightness detection
        const croppedCanvas = this.autoCropToCard(sourceCanvas);

        // Check if cropping was applied
        if (croppedCanvas === sourceCanvas) {
            if (window.uiManager) {
                window.uiManager.showToast('לא נמצאו שוליים כהים לקיצוץ', 'info');
            }
            return;
        }

        // Convert to data URL and set as new template
        const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
        this.selectBackground(croppedUrl);

        if (window.uiManager) {
            window.uiManager.showToast('✂️ שוליים כהים הוסרו אוטומטית!', 'success');
        }
        console.log('✂️ Auto-trim applied successfully');
    }

    /**
     * Create and open the manual crop modal
     */
    openCropModal(templateImage) {
        // Remove existing modal if any
        const existing = document.getElementById('manual-crop-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'manual-crop-modal';
        modal.innerHTML = `
            <div class="crop-modal-overlay">
                <div class="crop-modal-content">
                    <div class="crop-header">
                        <h3>✂️ חיתוך רקע</h3>
                        <button class="crop-close-btn">&times;</button>
                    </div>
                    <div class="crop-body">
                        <p class="crop-instructions">גרור מלבן על האזור שברצונך לחתוך. האזור הנבחר יימתח לגודל הקלף.</p>
                        <div class="crop-canvas-container">
                            <canvas id="crop-canvas"></canvas>
                            <div id="crop-selection" class="crop-selection hidden"></div>
                        </div>
                    </div>
                    <div class="crop-footer">
                        <button class="crop-cancel-btn">ביטול</button>
                        <button class="crop-apply-btn" disabled>החל חיתוך</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .crop-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            .crop-modal-content {
                background: #1a1a2e;
                border-radius: 16px;
                border: 2px solid #d4af37;
                max-width: 90vw;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
            }
            .crop-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #333;
            }
            .crop-header h3 {
                margin: 0;
                color: #d4af37;
                font-size: 1.3rem;
            }
            .crop-close-btn {
                background: none;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
                transition: color 0.2s;
            }
            .crop-close-btn:hover { color: #fff; }
            .crop-body {
                padding: 20px;
                overflow: auto;
            }
            .crop-instructions {
                color: #aaa;
                margin-bottom: 16px;
                text-align: center;
            }
            .crop-canvas-container {
                position: relative;
                display: inline-block;
                cursor: crosshair;
            }
            #crop-canvas {
                max-width: 80vw;
                max-height: 60vh;
                border: 1px solid #444;
                border-radius: 8px;
            }
            .crop-selection {
                position: absolute;
                border: 2px dashed #d4af37;
                background: rgba(212, 175, 55, 0.2);
                pointer-events: none;
            }
            .crop-selection.hidden { display: none; }
            .crop-footer {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                padding: 16px 20px;
                border-top: 1px solid #333;
            }
            .crop-cancel-btn {
                padding: 10px 20px;
                border: 1px solid #666;
                background: #333;
                color: #fff;
                border-radius: 8px;
                cursor: pointer;
            }
            .crop-cancel-btn:hover { background: #444; }
            .crop-apply-btn {
                padding: 10px 20px;
                border: none;
                background: linear-gradient(135deg, #d4af37, #b8860b);
                color: #1a1a2e;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
            }
            .crop-apply-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .crop-apply-btn:not(:disabled):hover {
                background: linear-gradient(135deg, #e4bf47, #c8961b);
            }
        `;
        modal.appendChild(style);
        document.body.appendChild(modal);

        // Setup canvas
        const canvas = document.getElementById('crop-canvas');
        const ctx = canvas.getContext('2d');
        const container = modal.querySelector('.crop-canvas-container');
        const selectionDiv = document.getElementById('crop-selection');
        const applyBtn = modal.querySelector('.crop-apply-btn');

        // Get original image dimensions
        const imgW = templateImage.naturalWidth || templateImage.width;
        const imgH = templateImage.naturalHeight || templateImage.height;

        // Calculate display size that fits in viewport
        const maxW = window.innerWidth * 0.7;
        const maxH = window.innerHeight * 0.6;
        const displayScale = Math.min(maxW / imgW, maxH / imgH, 1);

        const displayW = Math.round(imgW * displayScale);
        const displayH = Math.round(imgH * displayScale);

        // Set canvas to DISPLAY size (not full image size)
        canvas.width = displayW;
        canvas.height = displayH;
        canvas.style.width = displayW + 'px';
        canvas.style.height = displayH + 'px';

        // Draw scaled image
        ctx.drawImage(templateImage, 0, 0, displayW, displayH);

        // Set container to exact canvas size
        container.style.width = displayW + 'px';
        container.style.height = displayH + 'px';

        // Store scale for final crop calculation
        const cropScale = imgW / displayW;

        // Selection state
        let isDrawing = false;
        let startX = 0, startY = 0;
        let selection = { x: 0, y: 0, width: 0, height: 0 };

        canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            isDrawing = true;
            selectionDiv.classList.remove('hidden');
        });

        // Use document-level mousemove so dragging works outside canvas
        document.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;

            const rect = canvas.getBoundingClientRect();

            // Calculate position and clamp to canvas bounds
            let posX = e.clientX - rect.left;
            let posY = e.clientY - rect.top;

            // Clamp to display bounds
            posX = Math.max(0, Math.min(displayW, posX));
            posY = Math.max(0, Math.min(displayH, posY));

            // Store selection in display coordinates
            selection = {
                x: Math.min(startX, posX),
                y: Math.min(startY, posY),
                width: Math.abs(posX - startX),
                height: Math.abs(posY - startY)
            };

            // Position selection div directly (1:1 with canvas display)
            selectionDiv.style.left = selection.x + 'px';
            selectionDiv.style.top = selection.y + 'px';
            selectionDiv.style.width = selection.width + 'px';
            selectionDiv.style.height = selection.height + 'px';
        });

        // Use document-level mouseup so it triggers even if mouse is outside canvas
        document.addEventListener('mouseup', () => {
            if (!isDrawing) return;
            isDrawing = false;
            // Enable apply button if selection is valid
            if (selection.width > 20 && selection.height > 20) {
                applyBtn.disabled = false;
            }
        });

        // Close handlers
        const closeModal = () => modal.remove();
        modal.querySelector('.crop-close-btn').addEventListener('click', closeModal);
        modal.querySelector('.crop-cancel-btn').addEventListener('click', closeModal);
        modal.querySelector('.crop-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });

        // Apply crop
        applyBtn.addEventListener('click', () => {
            // Convert selection from display coordinates to original image coordinates
            const origX = selection.x * cropScale;
            const origY = selection.y * cropScale;
            const origW = selection.width * cropScale;
            const origH = selection.height * cropScale;

            // Create cropped canvas at card size
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = 750;
            croppedCanvas.height = 1050;
            const croppedCtx = croppedCanvas.getContext('2d');

            // Draw the selected area stretched to fill the card
            croppedCtx.drawImage(
                templateImage,
                origX, origY, origW, origH,
                0, 0, 750, 1050
            );

            // Convert to data URL and set as new background
            const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
            this.selectBackground(croppedUrl);

            console.log(`✂️ Manual crop applied: (${Math.round(origX)},${Math.round(origY)}) ${Math.round(origW)}x${Math.round(origH)} → 750x1050`);
            closeModal();
        });
    }

    async openModal() {
        console.log('[BGManager] openModal called, modal:', this.modal);
        if (!this.modal) {
            console.error('[BGManager] ❌ Modal not found! Cannot open.');
            return;
        }

        console.log('[BGManager] Opening modal...');
        this.updateModalPosition();
        this.modal.style.zIndex = '750'; // Above scroll-container (600), below modals (800)
        this.modal.classList.remove('hidden');

        // Load images if not already loaded
        if (this.gridDisplay.children.length === 0) {
            await this.loadAllGrids();
        }
    }

    updateModalPosition() {
        const sidebar = document.querySelector('.sidebar-end');
        if (sidebar && this.modal) {
            const rect = sidebar.getBoundingClientRect();
            const isRTL = document.body.classList.contains('rtl');

            // Apply sidebar dimensions and position to the modal
            this.modal.style.top = `${rect.top}px`;
            this.modal.style.height = `${rect.height}px`;

            // Expand width significantly to allow 3 columns (approx 900px or wider)
            const expandedWidth = Math.min(950, window.innerWidth * 0.7);
            this.modal.style.width = `${expandedWidth}px`;

            if (isRTL) {
                // RTL: Modal expands to the left of sidebar
                this.modal.style.left = `${rect.left}px`;
                this.modal.style.right = 'auto';
            } else {
                // LTR: Modal expands to the left from the sidebar's right edge
                const rightEdge = window.innerWidth - rect.right;
                this.modal.style.right = `${rightEdge}px`;
                this.modal.style.left = 'auto';
            }

            console.log(`[BGManager] Modal positioned - isRTL: ${isRTL}, rect:`, rect);
        }
    }

    closeModal() {
        if (this.modal) this.modal.classList.add('hidden');
    }

    async loadAllGrids() {
        // Return immediately if already populated
        if (this.allSlices && this.allSlices.length > 0) return;

        this.allSlices = []; // Reset
        let firstBatch = true;

        for (const imagePath of this.gridImages) {
            try {
                if (firstBatch && this.gridDisplay) {
                    this.gridDisplay.innerHTML = '';
                    firstBatch = false;
                }

                console.log(`BackgroundManager: Processing ${imagePath}...`);
                const slices = await this.sliceGrid(imagePath);

                // Store in memory
                this.allSlices.push(...slices);

                // Render this batch
                this.renderGrid(slices, true);

            } catch (error) {
                console.error(`Failed to load grid ${imagePath}:`, error);
            }
        }

        if (this.allSlices.length === 0 && this.gridDisplay) {
            this.gridDisplay.innerHTML = '<div style="color: #ff6b6b; grid-column: 1/-1; text-align: center;">שגיאה בטעינת הרקעים. בדוק קונסול.</div>';
        }
    }

    async pickRandomBackground() {
        // Ensure grids are loaded
        if (!this.allSlices || this.allSlices.length === 0) {
            console.log("🎲 Random Background: Loading grids first...");
            await this.loadAllGrids();
        }

        if (this.allSlices && this.allSlices.length > 0) {
            const randomSlice = this.allSlices[Math.floor(Math.random() * this.allSlices.length)];
            console.log("🎲 Random Background selected!");
            this.selectBackground(randomSlice);
            return randomSlice;
        } else {
            console.warn("⚠️ No backgrounds available for random selection.");
            return null;
        }
    }

    renderGrid(slices, append = false) {
        if (!append && this.gridDisplay) this.gridDisplay.innerHTML = '';
        if (!this.gridDisplay) return;

        slices.forEach((sliceUrl) => {
            const div = document.createElement('div');
            div.className = 'bg-thumbnail';
            div.style.cursor = 'pointer';
            div.style.border = '2px solid transparent';
            div.style.borderRadius = '8px';
            div.style.overflow = 'hidden';
            div.style.transition = 'all 0.2s';
            div.style.position = 'relative';
            div.style.aspectRatio = '2/3'; // Card aspect ratio
            div.style.animation = 'fadeIn 0.5s ease-out';

            const img = document.createElement('img');
            img.src = sliceUrl;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';

            div.appendChild(img);

            div.addEventListener('mouseenter', () => {
                div.style.borderColor = '#d4af37';
                div.style.transform = 'scale(1.05)';
                div.style.zIndex = '10';
            });

            div.addEventListener('mouseleave', () => {
                div.style.borderColor = 'transparent';
                div.style.transform = 'scale(1)';
                div.style.zIndex = '1';
            });

            div.addEventListener('click', () => {
                this.selectBackground(sliceUrl);
            });

            this.gridDisplay.appendChild(div);
        });
    }

    async selectBackground(url) {
        if (this.renderer) {
            await this.renderer.setTemplate(url);
            // Trigger re-render if needed
            if (window.stateManager) {
                window.stateManager.setLastContext(url); // Store context

                // NEW: Persist background in settings so it saves to history
                window.stateManager.updateStyle('cardBackgroundUrl', url);

                window.stateManager.notify('cardData');
            } else {
                this.renderer.render({}, {});
            }
        }
        this.closeModal();
    }

    /**
     * Auto-crop a canvas to find and remove ONLY very dark (black) outer margins
     * Much less aggressive - only removes clearly black/very dark borders
     * @param {HTMLCanvasElement} sourceCanvas - The canvas with potential dark margins
     * @returns {HTMLCanvasElement} - Cropped canvas or original if no dark margins found
     */
    autoCropToCard(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;

        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, w, h);
        } catch (e) {
            console.warn('autoCropToCard: Cannot get image data (CORS?), skipping crop');
            return sourceCanvas;
        }

        const data = imageData.data;

        // Helper: Get brightness at (x, y) - returns 0-255
        const getBrightness = (x, y) => {
            const idx = (y * w + x) * 4;
            return (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
        };

        // Helper: Check if a line is very dark (average brightness < threshold)
        const isLineDark = (start, end, fixed, isHorizontal, threshold = 40) => {
            let sum = 0, count = 0;
            const step = Math.max(1, Math.floor((end - start) / 30));
            for (let i = start; i < end; i += step) {
                const x = isHorizontal ? i : fixed;
                const y = isHorizontal ? fixed : i;
                if (x >= 0 && x < w && y >= 0 && y < h) {
                    sum += getBrightness(x, y);
                    count++;
                }
            }
            return count > 0 && (sum / count) < threshold;
        };

        // VERY DARK threshold - only trim if margin is almost black
        const DARK_THRESHOLD = 40;  // Very dark (0-255 scale)
        const MIN_MARGIN_PERCENT = 0.05;  // Require at least 5% margin to trim

        let top = 0, bottom = h - 1, left = 0, right = w - 1;

        // Scan from TOP - find first row that's NOT very dark
        for (let y = 0; y < h * 0.15; y++) {
            if (!isLineDark(w * 0.2, w * 0.8, y, true, DARK_THRESHOLD)) {
                top = y;
                break;
            }
        }

        // Scan from BOTTOM
        for (let y = h - 1; y > h * 0.85; y--) {
            if (!isLineDark(w * 0.2, w * 0.8, y, true, DARK_THRESHOLD)) {
                bottom = y;
                break;
            }
        }

        // Scan from LEFT
        for (let x = 0; x < w * 0.15; x++) {
            if (!isLineDark(h * 0.2, h * 0.8, x, false, DARK_THRESHOLD)) {
                left = x;
                break;
            }
        }

        // Scan from RIGHT
        for (let x = w - 1; x > w * 0.85; x--) {
            if (!isLineDark(h * 0.2, h * 0.8, x, false, DARK_THRESHOLD)) {
                right = x;
                break;
            }
        }

        const cropW = right - left;
        const cropH = bottom - top;

        // Calculate actual margins
        const marginLeft = left;
        const marginRight = w - right - 1;
        const marginTop = top;
        const marginBottom = h - bottom - 1;
        const minMargin = Math.min(marginLeft, marginRight, marginTop, marginBottom);

        // Skip if margins are too small (less than 5%)
        if (minMargin < w * MIN_MARGIN_PERCENT) {
            console.log('autoCropToCard: No significant dark margins found, skipping');
            return sourceCanvas;
        }

        // Validate aspect ratio (should be close to 2:3)
        const cropRatio = cropW / cropH;
        const targetRatio = 750 / 1050;
        if (cropRatio < targetRatio * 0.7 || cropRatio > targetRatio * 1.3) {
            console.log('autoCropToCard: Aspect ratio mismatch after crop, skipping');
            return sourceCanvas;
        }

        console.log(`autoCropToCard: Trimming dark margins - L:${marginLeft} R:${marginRight} T:${marginTop} B:${marginBottom}`);

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = 750;
        croppedCanvas.height = 1050;
        const croppedCtx = croppedCanvas.getContext('2d');

        croppedCtx.drawImage(
            sourceCanvas,
            left, top, cropW, cropH,
            0, 0, 750, 1050
        );

        return croppedCanvas;
    }


    sliceGrid(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const slices = [];
                const cols = 3;

                // Determine rows based on aspect ratio
                // 9:16 (0.5625) -> likely 3x4 grid
                // 2:3 (0.666) -> likely 3x3 grid
                const imageRatio = img.width / img.height;
                const rows = imageRatio < 0.6 ? 4 : 3;

                const cellWidth = img.width / cols;
                const cellHeight = img.height / rows;

                console.log(`Processing grid: ${imagePath}`);
                console.log(`Image Size: ${img.width}x${img.height}`);
                console.log(`Cell Size: ${cellWidth.toFixed(2)}x${cellHeight.toFixed(2)}`);

                // Target Aspect Ratio (2:3)
                const targetRatio = 2 / 3;

                // Calculate "Cover" Crop for 2:3 Ratio using full cell dimensions
                let cropWidth, cropHeight;
                const cellRatio = cellWidth / cellHeight;

                if (cellRatio > targetRatio) {
                    // Cell is wider than target (e.g., 4:3 or Square vs 2:3)
                    // Constrain by height, crop width
                    cropHeight = cellHeight;
                    cropWidth = cropHeight * targetRatio;
                } else {
                    // Cell is taller than target (e.g., 9:16 vs 2:3)
                    // Constrain by width, crop height
                    cropWidth = cellWidth;
                    cropHeight = cropWidth / targetRatio;
                }

                // Center the Crop within the Cell
                const startX = (cellWidth - cropWidth) / 2;
                const startY = (cellHeight - cropHeight) / 2;

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const canvas = document.createElement('canvas');
                        // Set canvas to high resolution for quality
                        canvas.width = 1000;
                        canvas.height = 1500;
                        const ctx = canvas.getContext('2d');

                        // Source coordinates relative to the image
                        const sx = (c * cellWidth) + startX;
                        const sy = (r * cellHeight) + startY;

                        ctx.drawImage(
                            img,
                            sx, sy, cropWidth, cropHeight, // Source Crop
                            0, 0, canvas.width, canvas.height // Destination (Scaled to fit)
                        );

                        // NOTE: Auto-crop disabled - many backgrounds have intentional decorative elements
                        // that would be incorrectly removed. Use original sliced canvas.
                        // const croppedCanvas = this.autoCropToCard(canvas);

                        slices.push(canvas.toDataURL('image/jpeg', 0.9));
                    }
                }
                resolve(slices);
            };
            img.onerror = reject;
            img.src = imagePath;
        });
    }
}
