export class PrintManager {
    constructor() {
        this.modal = null;
        this.cards = [];
        this.settings = {
            cardWidth: 63, // mm
            cardHeight: 88, // mm
            gap: 2, // mm
            paperSize: 'a4', // a4, letter
            orientation: 'portrait',
            scale: 1.0,
            calibration: 1.0
        };

        // Wait for components to load
        if (window.areComponentsLoaded) {
            this.init();
        } else {
            document.addEventListener('componentsLoaded', () => this.init());
        }
    }

    init() {
        this.modal = document.getElementById('print-modal');
        if (!this.modal) {
            console.error("PrintManager: #print-modal not found");
            return;
        }

        this.bindEvents();
        console.log("🖨️ PrintManager Initialized");
    }

    bindEvents() {
        // Close / Cancel
        document.getElementById('cancel-print-btn').onclick = () => this.closeModal();

        // Print
        document.getElementById('do-print-btn').onclick = () => {
            this.handlePrint();
        };

        // Inputs
        const bindInput = (id, settingKey, isNumber = false) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', (e) => {
                let val = isNumber ? parseFloat(e.target.value) : e.target.value;
                this.settings[settingKey] = val;

                // --- Aspect Ratio Logic ---
                const isLock = document.getElementById('print-lock-ratio')?.checked;

                if (isLock && isNumber) {
                    const ratio = 88 / 63; // Standard Card Ratio ~1.396
                    if (settingKey === 'cardWidth') {
                        // Width changed -> update Height
                        this.settings.cardHeight = parseFloat((val * ratio).toFixed(1));
                        this.syncInput('print-card-height', this.settings.cardHeight);
                    } else if (settingKey === 'cardHeight') {
                        // Height changed -> update Width
                        this.settings.cardWidth = parseFloat((val / ratio).toFixed(1));
                        this.syncInput('print-card-width', this.settings.cardWidth);
                    }
                }
                // --------------------------

                // Sync slider/input pairs
                if (id.includes('slider')) {
                    const input = document.getElementById(id.replace('slider', 'input'));
                    if (input) input.value = val;
                } else if (id.includes('input')) {
                    const slider = document.getElementById(id.replace('input', 'slider'));
                    if (slider) slider.value = val;
                }

                // Special display updates
                if (settingKey === 'scale') {
                    document.getElementById('print-scale-display').textContent = `${Math.round(val * 100)}%`;
                }
                if (settingKey === 'calibration') {
                    document.getElementById('print-calibration-display').textContent = `${Math.round(val * 100)}%`;
                }
                if (settingKey === 'gap') {
                    document.getElementById('print-gap-display').textContent = val;
                }

                this.renderPreview();
            });
        };

        bindInput('print-card-width-slider', 'cardWidth', true);
        bindInput('print-card-width-input', 'cardWidth', true);
        bindInput('print-card-height-slider', 'cardHeight', true);
        bindInput('print-card-height-input', 'cardHeight', true);
        bindInput('print-gap-slider', 'gap', true);
        bindInput('print-scale-slider', 'scale', true);
        bindInput('print-calibration-slider', 'calibration', true);
        bindInput('print-paper-size', 'paperSize');

        // Orientation Buttons
        document.getElementById('print-orient-p').onclick = () => {
            this.settings.orientation = 'portrait';
            this.updateOrientationUI();
            this.renderPreview();
        };
        document.getElementById('print-orient-l').onclick = () => {
            this.settings.orientation = 'landscape';
            this.updateOrientationUI();
            this.renderPreview();
        };
    }

    syncInput(baseId, value) {
        const slider = document.getElementById(`${baseId}-slider`);
        const input = document.getElementById(`${baseId}-input`);
        if (slider) slider.value = value;
        if (input) input.value = value;
    }

    updateOrientationUI() {
        const pBtn = document.getElementById('print-orient-p');
        const lBtn = document.getElementById('print-orient-l');
        if (this.settings.orientation === 'portrait') {
            pBtn.classList.add('active');
            lBtn.classList.remove('active');
        } else {
            pBtn.classList.remove('active');
            lBtn.classList.add('active');
        }
    }

    openPrintModal(cards) {
        this.cards = cards;
        if (!this.modal) return;

        this.modal.classList.remove('hidden');
        this.renderPreview();
    }

    closeModal() {
        if (this.modal) this.modal.classList.add('hidden');
    }

    renderPreview() {
        const paper = document.getElementById('print-paper-preview');
        const grid = document.getElementById('print-grid');
        const info = document.getElementById('print-info');

        // Paper Dims (mm)
        let paperW = 210;
        let paperH = 297;

        if (this.settings.paperSize === 'letter') {
            paperW = 215.9; // 8.5"
            paperH = 279.4; // 11"
        }

        if (this.settings.orientation === 'landscape') {
            [paperW, paperH] = [paperH, paperW];
        }

        // Apply styles to paper preview
        paper.style.width = `${paperW}mm`;
        paper.style.height = `${paperH}mm`;

        // Calculate columns/rows fitting
        // Available space
        const availW = paperW - 10; // 5mm padding each side
        const availH = paperH - 10;

        // Card dims + gap
        const cW = this.settings.cardWidth * this.settings.scale;
        const cH = this.settings.cardHeight * this.settings.scale;

        // CSS Grid setup
        grid.style.gridTemplateColumns = `repeat(auto-fill, ${cW}mm)`;
        grid.style.gridAutoRows = `${cH}mm`;
        grid.style.gap = `${this.settings.gap}mm`;
        grid.style.justifyContent = 'center';
        grid.style.padding = '5mm'; // Print margin

        // Render Cards
        grid.innerHTML = '';
        this.cards.forEach(card => {
            const img = document.createElement('img');
            // Prefer thumbnail (full card) over raw image
            let src = card.thumbnail;
            if (!src || src === 'null' || src === 'undefined') {
                src = card.cardData.imageUrl || 'assets/textures/stone_slab.png';
            }
            img.src = src;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover'; // Maintain aspect or fill? Cards should be exact ratio usually.
            // If user changes ratio via width/height sliders, image might stretch.
            // Let's allow stretch to fill the "cut line" dim.
            img.style.backgroundColor = 'black';
            img.style.border = '1px dashed #ccc'; // Cut line guide
            img.style.boxSizing = 'border-box';

            grid.appendChild(img);
        });

        // Calculate fit info
        const cols = Math.floor(availW / (cW + this.settings.gap));
        const rows = Math.floor(availH / (cH + this.settings.gap));
        const perPage = cols * rows;
        const totalPages = Math.ceil(this.cards.length / perPage);

        info.innerHTML = `
            <strong>סטטוס דף:</strong><br>
            גודל נייר: ${paperW.toFixed(0)}x${paperH.toFixed(0)} מ"מ<br>
            קלפים בדף: ${Math.min(this.cards.length, perPage)} / ${perPage} מקסימום<br>
            סה"כ דפים: ${totalPages}
        `;

        // Ensure calibration line exists in preview
        let calibration = paper.querySelector('.calibration-line');
        if (!calibration) {
            calibration = document.createElement('div');
            calibration.className = 'calibration-line';
            calibration.innerHTML = `
                <div class="calibration-line-marker"></div>
                <span class="calibration-text">10cm Calibration Scale (Answer to scaling)</span>
            `;
            paper.appendChild(calibration);
        }
    }
    handlePrint() {
        console.log("🖨️ Preparing to print...");

        // 1. Create Layout Style for Print
        let style = document.getElementById('print-dynamic-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'print-dynamic-style';
            document.head.appendChild(style);
        }

        // Determine CSS size string and explicit widths
        const isLetter = this.settings.paperSize === 'letter';
        const sizeStr = isLetter ? 'letter' : 'A4';
        const orientStr = this.settings.orientation; // 'portrait' or 'landscape'

        // Calculate explicit width for container to prevent "100%" ambiguity
        let pageWidth = isLetter ? 215.9 : 210;
        let pageHeight = isLetter ? 279.4 : 297;

        if (orientStr === 'landscape') {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
        }

        style.innerHTML = `
            @page {
                size: ${sizeStr} ${orientStr};
                margin: 0;
            }
            @media print {
                #app { display: none !important; }
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100% !important;
                    height: auto !important;
                    zoom: 1 !important;
                    transform: none !important;
                    background: white !important;
                    background-image: none !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                html::after, body::after {
                    content: none !important;
                    display: none !important;
                    background: none !important;
                }
                #print-section {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: auto;
                    padding: 5mm;
                    box-sizing: border-box;
                    overflow: hidden; /* Clip overflow to prevent resize triggering */
                    background: white;
                }
            }
        `;

        // 2. Create Print Section if not exists
        let printSection = document.getElementById('print-section');
        if (!printSection) {
            printSection = document.createElement('div');
            printSection.id = 'print-section';
            document.body.appendChild(printSection);
        }

        // 3. Clear previous
        printSection.innerHTML = '';

        // 4. Clone content
        const grid = document.getElementById('print-grid');
        if (grid) {
            const gridClone = grid.cloneNode(true);
            printSection.appendChild(gridClone);
        }

        // 5. Add Calibration Line INSIDE wrapper
        const calibration = document.createElement('div');
        calibration.className = 'calibration-line';
        calibration.innerHTML = `
            <div class="calibration-line-marker"></div>
            <span class="calibration-text">10cm Calibration Scale (Answer to scaling)</span>
        `;
        printSection.appendChild(calibration);

        // 6. Print
        window.print();

        // 7. Cleanup
        setTimeout(() => {
            printSection.remove();
        }, 1000);
    }
}

export const printManager = new PrintManager();
window.printManager = printManager;
