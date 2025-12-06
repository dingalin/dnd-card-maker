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

        this.init();
    }

    init() {
        if (this.openBtn) {
            this.openBtn.addEventListener('click', () => this.openModal());
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeModal());
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

    async openModal() {
        if (!this.modal) return;

        this.updateModalPosition();
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

            // Apply sidebar dimensions and position to the modal
            this.modal.style.top = `${rect.top}px`;
            this.modal.style.left = `${rect.left}px`;

            // Expand width significantly to allow 3 columns (approx 900px or wider)
            // We clamp it to not overflow the window width too aggressively
            const expandedWidth = Math.min(950, window.innerWidth - rect.left - 20);
            this.modal.style.width = `${expandedWidth}px`;

            this.modal.style.height = `${rect.height}px`;

            // Match the sidebar's border radius if possible/needed, though CSS handles it
        }
    }

    closeModal() {
        if (this.modal) this.modal.classList.add('hidden');
    }

    async loadAllGrids() {
        // Clear initial loading text only when the first batch is ready
        let firstBatch = true;

        for (const imagePath of this.gridImages) {
            try {
                // Determine if we need to clear "Loading..." text
                if (firstBatch) {
                    this.gridDisplay.innerHTML = '';
                    firstBatch = false;
                }

                // Show a mini loader or just process
                console.log(`BackgroundManager: Processing ${imagePath}...`);
                const slices = await this.sliceGrid(imagePath);

                // Render this batch immediately
                this.renderGrid(slices, true); // true = append

            } catch (error) {
                console.error(`Failed to load grid ${imagePath}:`, error);
                // If specific grid fails, continue to next
            }
        }

        if (firstBatch) {
            this.gridDisplay.innerHTML = '<div style="color: #ff6b6b; grid-column: 1/-1; text-align: center;">שגיאה בטעינת הרקעים. בדוק קונסול.</div>';
        }
    }

    renderGrid(slices, append = false) {
        if (!append) this.gridDisplay.innerHTML = '';

        slices.forEach((sliceUrl, index) => {
            const div = document.createElement('div');
            div.className = 'bg-thumbnail';
            div.style.cursor = 'pointer';
            div.style.border = '2px solid transparent';
            div.style.borderRadius = '8px';
            div.style.overflow = 'hidden';
            div.style.transition = 'all 0.2s';
            div.style.position = 'relative';
            div.style.aspectRatio = '2/3'; // Card aspect ratio
            div.style.animation = 'fadeIn 0.5s ease-out'; // Add nice fade in

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

    selectBackground(url) {
        if (this.renderer) {
            this.renderer.setTemplate(url);
            // Trigger re-render if needed
            if (window.stateManager) {
                window.stateManager.setLastContext(url); // Store context
                window.stateManager.notify('cardData');
            } else {
                this.renderer.render({}, {});
            }
        }
        this.closeModal();
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
