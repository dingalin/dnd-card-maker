// Extend Window interface
declare global {
    interface Window {
        printManager: PrintManager;
        areComponentsLoaded?: boolean;
        i18n?: {
            t: (key: string) => string;
        };
    }
}

// Types
interface PrintSettings {
    cardWidth: number;
    cardHeight: number;
    gap: number;
    paperSize: 'a4' | 'letter';
    orientation: 'portrait' | 'landscape';
    scale: number;
    calibration: number;
    doubleSided: boolean;
}

interface CardToPrint {
    thumbnail?: string;
    backThumbnail?: string;
    cardData?: {
        imageUrl?: string;
        backThumbnail?: string;
        capturedBackImage?: string;
    };
}

type SettingKey = keyof PrintSettings;

export class PrintManager {
    private modal: HTMLElement | null;
    private cards: CardToPrint[];
    private settings: PrintSettings;

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
            calibration: 1.0,
            doubleSided: false // Front+Back side by side mode
        };

        // Wait for components to load
        if (window.areComponentsLoaded) {
            this.init();
        } else {
            document.addEventListener('componentsLoaded', () => this.init());
        }
    }

    init(): void {
        this.modal = document.getElementById('print-modal');
        if (!this.modal) {
            console.error("PrintManager: #print-modal not found");
            return;
        }

        this.bindEvents();
        console.log("🖨️ PrintManager Initialized");
    }

    bindEvents(): void {
        // Close / Cancel
        const cancelBtn = document.getElementById('cancel-print-btn');
        if (cancelBtn) cancelBtn.onclick = () => this.closeModal();

        // Print
        const printBtn = document.getElementById('do-print-btn');
        if (printBtn) {
            printBtn.onclick = () => {
                this.handlePrint();
            };
        }

        // Inputs
        const bindInput = (id: string, settingKey: SettingKey, isNumber: boolean = false): void => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (!el) return;
            el.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                const val = isNumber ? parseFloat(target.value) : target.value;
                (this.settings as Record<string, unknown>)[settingKey] = val;

                // --- Aspect Ratio Logic ---
                const lockCheckbox = document.getElementById('print-lock-ratio') as HTMLInputElement | null;
                const isLock = lockCheckbox?.checked;

                if (isLock && isNumber && typeof val === 'number') {
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
                    const input = document.getElementById(id.replace('slider', 'input')) as HTMLInputElement | null;
                    if (input) input.value = String(val);
                } else if (id.includes('input')) {
                    const slider = document.getElementById(id.replace('input', 'slider')) as HTMLInputElement | null;
                    if (slider) slider.value = String(val);
                }

                // Special display updates
                if (settingKey === 'scale') {
                    const display = document.getElementById('print-scale-display');
                    if (display) display.textContent = `${Math.round(Number(val) * 100)}%`;
                }
                if (settingKey === 'calibration') {
                    const display = document.getElementById('print-calibration-display');
                    if (display) display.textContent = `${Math.round(Number(val) * 100)}%`;
                }
                if (settingKey === 'gap') {
                    const display = document.getElementById('print-gap-display');
                    if (display) display.textContent = String(val);
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
        const orientP = document.getElementById('print-orient-p');
        const orientL = document.getElementById('print-orient-l');
        if (orientP) {
            orientP.onclick = () => {
                this.settings.orientation = 'portrait';
                this.updateOrientationUI();
                this.renderPreview();
            };
        }
        if (orientL) {
            orientL.onclick = () => {
                this.settings.orientation = 'landscape';
                this.updateOrientationUI();
                this.renderPreview();
            };
        }

        // Size Preset Buttons
        document.querySelectorAll('.size-preset-btn').forEach(btn => {
            const button = btn as HTMLButtonElement;
            button.onclick = () => {
                const width = parseFloat(button.dataset.width || '63');
                const height = parseFloat(button.dataset.height || '88');

                this.settings.cardWidth = width;
                this.settings.cardHeight = height;

                // Sync all inputs
                this.syncInput('print-card-width', width);
                this.syncInput('print-card-height', height);

                // Update active state
                document.querySelectorAll('.size-preset-btn').forEach(b => b.classList.remove('active'));
                button.classList.add('active');

                this.renderPreview();
            };
        });

        // Double-Sided Checkbox
        const doubleSidedCheckbox = document.getElementById('print-double-sided') as HTMLInputElement | null;
        if (doubleSidedCheckbox) {
            doubleSidedCheckbox.addEventListener('change', (e: Event) => {
                this.settings.doubleSided = (e.target as HTMLInputElement).checked;
                console.log('🃏 Double-sided mode:', this.settings.doubleSided);
                this.renderPreview();
            });
        }
    }

    syncInput(baseId: string, value: number): void {
        const slider = document.getElementById(`${baseId}-slider`) as HTMLInputElement | null;
        const input = document.getElementById(`${baseId}-input`) as HTMLInputElement | null;
        if (slider) slider.value = String(value);
        if (input) input.value = String(value);
    }

    updateOrientationUI(): void {
        const pBtn = document.getElementById('print-orient-p');
        const lBtn = document.getElementById('print-orient-l');
        if (this.settings.orientation === 'portrait') {
            pBtn?.classList.add('active');
            lBtn?.classList.remove('active');
        } else {
            pBtn?.classList.remove('active');
            lBtn?.classList.add('active');
        }
    }

    openPrintModal(cards: CardToPrint[]): void {
        this.cards = cards;
        if (!this.modal) return;

        this.modal.classList.remove('hidden');
        this.renderPreview();
    }

    closeModal(): void {
        if (this.modal) this.modal.classList.add('hidden');
    }

    renderPreview(): void {
        const paper = document.getElementById('print-paper-preview');
        const grid = document.getElementById('print-grid');
        const info = document.getElementById('print-info');

        if (!paper || !grid || !info) return;

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
        // In double-sided mode, each "unit" is 2 cards wide (front + back)
        const effectiveCardWidth = this.settings.doubleSided ? cW * 2 : cW;

        grid.style.gridTemplateColumns = `repeat(auto-fill, ${effectiveCardWidth}mm)`;
        grid.style.gridAutoRows = `${cH}mm`;
        grid.style.gap = `${this.settings.gap}mm`;
        grid.style.justifyContent = 'center';
        grid.style.padding = '5mm'; // Print margin

        // Render Cards
        grid.innerHTML = '';
        this.cards.forEach(card => {
            if (this.settings.doubleSided) {
                // Create a container for front+back pair
                const pair = document.createElement('div');
                pair.style.display = 'flex';
                pair.style.width = `${effectiveCardWidth}mm`;
                pair.style.height = `${cH}mm`;
                pair.style.gap = '0';
                pair.style.border = '1px dashed #ccc';
                pair.style.boxSizing = 'border-box';

                // Front image
                const frontImg = document.createElement('img');
                let frontSrc = card.thumbnail;
                if (!frontSrc || frontSrc === 'null' || frontSrc === 'undefined') {
                    frontSrc = card.cardData?.imageUrl || 'assets/textures/stone_slab.png';
                }
                frontImg.src = frontSrc;
                frontImg.style.width = '50%';
                frontImg.style.height = '100%';
                frontImg.style.objectFit = 'cover';
                frontImg.style.backgroundColor = 'black';
                frontImg.style.borderRight = '1px dotted #999'; // Fold line

                // Back image
                const backImg = document.createElement('img');
                let backSrc = card.backThumbnail || card.cardData?.backThumbnail || card.cardData?.capturedBackImage;
                if (!backSrc || backSrc === 'null' || backSrc === 'undefined') {
                    // Fallback: use placeholder or same as front
                    backSrc = 'assets/textures/stone_slab.png';
                }
                backImg.src = backSrc;
                backImg.style.width = '50%';
                backImg.style.height = '100%';
                backImg.style.objectFit = 'cover';
                backImg.style.backgroundColor = 'black';

                pair.appendChild(frontImg);
                pair.appendChild(backImg);
                grid.appendChild(pair);
            } else {
                const img = document.createElement('img');
                // Prefer thumbnail (full card) over raw image
                let src = card.thumbnail;
                if (!src || src === 'null' || src === 'undefined') {
                    src = card.cardData?.imageUrl || 'assets/textures/stone_slab.png';
                }
                img.src = src;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.backgroundColor = 'black';
                img.style.border = '1px dashed #ccc'; // Cut line guide
                img.style.boxSizing = 'border-box';

                grid.appendChild(img);
            }
        });

        // Calculate fit info
        const cols = Math.floor(availW / (cW + this.settings.gap));
        const rows = Math.floor(availH / (cH + this.settings.gap));
        const perPage = cols * rows;
        const totalPages = Math.ceil(this.cards.length / perPage);

        const i18n = window.i18n;
        const statusLabel = i18n?.t('printModal.status') || 'Page Status:';
        const paperLabel = i18n?.t('printModal.paperSizeLabel') || 'Paper Size:';
        const cardsLabel = i18n?.t('printModal.cardsPerPage') || 'Cards per Page:';
        const totalLabel = i18n?.t('printModal.totalPages') || 'Total Pages:';
        const maxLabel = i18n?.t('printModal.maximum') || 'maximum';

        info.innerHTML = `
            <strong>${statusLabel}</strong><br>
            ${paperLabel} ${paperW.toFixed(0)}x${paperH.toFixed(0)} mm<br>
            ${cardsLabel} ${Math.min(this.cards.length, perPage)} / ${perPage} ${maxLabel}<br>
            ${totalLabel} ${totalPages}
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

    handlePrint(): void {
        console.log("🖨️ Preparing to print...");

        // 1. Create Layout Style for Print
        let style = document.getElementById('print-dynamic-style') as HTMLStyleElement | null;
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
            printSection?.remove();
        }, 1000);
    }
}

export const printManager = new PrintManager();
window.printManager = printManager;
