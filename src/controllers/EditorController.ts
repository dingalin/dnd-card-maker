// @ts-nocheck
import { StateManager, AppState } from '../state';
import { I18nService } from '../i18n';

// Helper interface for globals
interface WindowGlobals {
    i18n?: I18nService;
    OFFICIAL_ITEMS: Record<string, Record<string, string[]>>;
}

export class EditorController {
    private state: StateManager;
    private isFlipped: boolean;
    private globalMarginY: number;
    private globalMarginX: number;

    constructor(stateManager: StateManager) {
        this.state = stateManager;
        this.isFlipped = false; // State for UI toggle
        this.globalMarginY = 0; // Store global vertical offset
        this.globalMarginX = 0; // Store global horizontal offset
        this.setupListeners();
    }

    setupListeners() {
        this.setupFlipListener();
        this.setupInputListeners();
        this.setupSliderListeners();
        this.setupGlobalMarginListeners();
        this.setupFontListeners();
        this.setupTypeSelection();
        this.setupLevelSelection();
        this.setupColorPalette();
        this.setupScrollNoteListeners();

        // Subscribe to external state changes (e.g. History Load)
        this.state.subscribe((newState: AppState, key: string) => {
            if (key === 'cardData' || key === 'fullState') {
                this.syncUIFromState(newState);
            }
        });

        // Subscribe to locale changes to refresh dropdowns
        const i18n = (window as unknown as WindowGlobals).i18n;
        if (i18n && i18n.onLocaleChange) {
            i18n.onLocaleChange(() => {
                // Refresh the subtype dropdown with new locale
                const typeSelect = document.getElementById('item-type') as HTMLSelectElement | null;
                if (typeSelect && typeSelect.value) {
                    typeSelect.dispatchEvent(new Event('change'));
                }
            });
        }
    }

    syncUIFromState(state: AppState) {
        if (!state || !state.cardData) return;

        // 0. Sync Core Stats (Special Logic)
        const coreStatsInput = document.getElementById('edit-core-stats') as HTMLInputElement | null;
        if (coreStatsInput && state.cardData) {
            if (state.cardData.weaponDamage) {
                coreStatsInput.value = state.cardData.damageType
                    ? `${state.cardData.weaponDamage} ${state.cardData.damageType}`
                    : state.cardData.weaponDamage;
            } else if (state.cardData.armorClass) {
                coreStatsInput.value = state.cardData.armorClass; // Just the number usually
            } else {
                coreStatsInput.value = '';
            }
        }

        // 1. Sync Text Inputs
        const editInputs: Record<string, string> = {
            'edit-name': 'front.title',
            'edit-type': 'front.type',
            'edit-rarity': 'front.rarity',
            'edit-quick-stats': 'front.quickStats',
            'edit-ability-name': 'back.title',
            'edit-ability-desc': 'back.mechanics',
            'edit-desc': 'back.lore',
            'edit-gold': 'front.gold',
            'edit-core-stats': 'front.coreStats' // Added core stats input
        };
        Object.entries(editInputs).forEach(([id, path]) => {
            const input = document.getElementById(id) as HTMLInputElement | null;
            if (!input) return;

            // Resolve dot notation for reading
            let val: any = state.cardData;
            if (path.includes('.')) {
                const keys = path.split('.');
                for (const k of keys) {
                    val = val ? val[k] : undefined;
                }
            } else {
                val = val[path];
            }

            if (val !== undefined) {
                input.value = val;
            }
        });

        // 2. Sync Sliders (Offsets & Settings) - now from nested front/back structure
        const frontSliders: Record<string, string> = {
            'name-offset': 'name',
            'type-offset': 'type',
            'rarity-offset': 'rarity',
            'coreStats-offset': 'coreStats',
            'stats-offset': 'stats',
            'gold-offset': 'gold',
            'image-offset': 'imageYOffset',
            'image-scale': 'imageScale',
            'image-rotation': 'imageRotation',
            'image-fade': 'imageFade',
            'image-shadow': 'imageShadow',
            'bg-scale': 'backgroundScale',
            'center-fade': 'centerFade',
            'name-width': 'nameWidth',
            'coreStats-width': 'coreStatsWidth',
            'stats-width': 'statsWidth'
        };

        const backSliders: Record<string, string> = {
            'ability-offset': 'abilityName',
            'mech-offset': 'mech',
            'lore-offset': 'lore',
            'ability-width': 'mechWidth',
            'lore-width': 'loreWidth'
        };

        // Sync front sliders
        if (state.settings && state.settings.front && state.settings.front.offsets) {
            Object.entries(frontSliders).forEach(([id, field]) => {
                const slider = document.getElementById(id) as HTMLInputElement | null;
                if (slider) {
                    if (state.settings.front.offsets[field] !== undefined) {
                        slider.value = String(state.settings.front.offsets[field]);
                    } else if (field === 'coreStats') {
                        // Fallback for new key that might be missing in old localstorage
                        slider.value = '680';
                    }
                }
            });
        }

        // Sync back sliders
        if (state.settings && state.settings.back && state.settings.back.offsets) {
            Object.entries(backSliders).forEach(([id, field]) => {
                const slider = document.getElementById(id) as HTMLInputElement | null;
                if (slider && state.settings.back.offsets[field] !== undefined) {
                    slider.value = String(state.settings.back.offsets[field]);
                }
            });
        }

        // 3. Sync Styles (Fonts)
        if (state.settings && state.settings.style) {
            const fontFamilySelect = document.getElementById('font-family-select') as HTMLSelectElement | null;
            if (fontFamilySelect && state.settings.style.fontFamily) {
                fontFamilySelect.value = state.settings.style.fontFamily;
            }

            // Sync Image Style logic if needed
            const styleOption = document.getElementById('image-style-option') as HTMLSelectElement | null;
            if (styleOption && state.settings.style.imageStyle) {
                styleOption.value = state.settings.style.imageStyle;
                styleOption.dispatchEvent(new Event('change'));
            }

            // Sync Image Color
            const colorInput = document.getElementById('image-bg-color') as HTMLInputElement | null;
            if (colorInput && state.settings.style.imageColor) {
                colorInput.value = state.settings.style.imageColor;
                // Update color swatch UI
                const palette = document.getElementById('color-palette');
                if (palette) {
                    palette.querySelectorAll('.color-swatch').forEach(s => {
                        if ((s as HTMLElement).dataset.value === state.settings.style.imageColor) s.classList.add('active');
                        else s.classList.remove('active');
                    });
                }
            }
        }

        // 4. Sync Font Bold/Italic checkboxes from nested structure
        const syncFontStyles = (fontStyles: any, prefix?: string) => {
            if (!fontStyles) return;
            Object.entries(fontStyles).forEach(([key, val]) => {
                let type, field;
                if (key.endsWith('Bold')) {
                    type = 'bold';
                    field = key.replace('Bold', '');
                } else if (key.endsWith('Italic')) {
                    type = 'italic';
                    field = key.replace('Italic', '');
                } else if (key.endsWith('Glow')) {
                    type = 'glow';
                    field = key.replace('Glow', '');
                }
                if (type && field) {
                    const id = `style-${type}-${field}`;
                    const cb = document.getElementById(id) as HTMLInputElement | null;
                    if (cb) cb.checked = !!val;
                }
            });
        };

        if (state.settings?.front?.fontStyles) {
            syncFontStyles(state.settings.front.fontStyles);
        }
        if (state.settings?.back?.fontStyles) {
            syncFontStyles(state.settings.back.fontStyles);
        }

        // 5. Sync Font Size displays
        const syncFontSizeDisplays = (fontSizes: any) => {
            if (!fontSizes) return;
            Object.entries(fontSizes).forEach(([key, val]) => {
                const display = document.getElementById(`${key}-display`);
                if (display) display.textContent = `${val}px`;
            });
        };

        if (state.settings?.front?.fontSizes) {
            syncFontSizeDisplays(state.settings.front.fontSizes);
        }
        if (state.settings?.back?.fontSizes) {
            syncFontSizeDisplays(state.settings.back.fontSizes);
        }

        console.log("♻️ UI Synced from State");
    }


    setupFlipListener() {
        const btn = document.getElementById('flip-card-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.isFlipped = !this.isFlipped;
                // Sync with StateManager
                this.state.state.isFlipped = this.isFlipped;

                // Trigger flip animation on canvas container
                // Trigger flip animation on card rotator
                const cardRotator = document.querySelector('.card-rotator') as HTMLElement;
                if (cardRotator) {
                    // Remove previous animation class
                    cardRotator.classList.remove('flipping');

                    // Force reflow to restart animation
                    void cardRotator.offsetWidth;

                    // Add animation class
                    cardRotator.classList.add('flipping');

                    // At the middle of the animation (90 degrees), update the card content
                    setTimeout(() => {
                        this.updateFlipState();
                    }, 250); // Half of the 500ms animation

                    // Remove animation class after it completes
                    setTimeout(() => {
                        cardRotator.classList.remove('flipping');
                    }, 500);
                } else {
                    this.updateFlipState();
                }
            });
        }
    }

    updateFlipState() {
        const btn = document.getElementById('flip-card-btn');
        const i18n = (window as unknown as WindowGlobals).i18n;
        if (btn) {
            btn.classList.toggle('active', this.isFlipped);
            btn.innerHTML = this.isFlipped
                ? (i18n?.t('preview.flip') || '↺ Flip Card')
                : (i18n?.t('preview.flipBack') || '↻ Flip Card');
        }

        // Toggle Visibility of Edit Sections based on Card Face
        const frontControls = document.getElementById('front-controls');
        const backControls = document.getElementById('back-controls');

        if (frontControls && backControls) {
            if (this.isFlipped) {
                frontControls.classList.add('hidden');
                backControls.classList.remove('hidden');
            } else {
                frontControls.classList.remove('hidden');
                backControls.classList.add('hidden');
            }
        }

        // Dispatch event for RenderController to catch
        document.dispatchEvent(new CustomEvent('card-flip', { detail: { isFlipped: this.isFlipped } }));
    }

    setupInputListeners() {
        const editInputs: Record<string, string> = {
            'edit-name': 'front.title',
            'edit-type': 'front.type',
            'edit-rarity': 'front.rarity',
            'edit-quick-stats': 'front.quickStats',
            'edit-gold': 'front.gold',
            'edit-ability-name': 'back.title',
            'edit-ability-desc': 'back.mechanics',
            'edit-desc': 'back.lore'
        };

        Object.keys(editInputs).forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement | null;
            if (input) {
                input.addEventListener('input', (e) => {
                    const target = e.target as HTMLInputElement;
                    this.state.updateCardField(editInputs[id], target.value);
                    this.state.saveCurrentCard(); // Auto-save
                });
            }
        });

        // Special Handler for Core Stats (Damage/AC)
        const coreStatsInput = document.getElementById('edit-core-stats') as HTMLInputElement | null;
        if (coreStatsInput) {
            coreStatsInput.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const val = target.value;
                const state = this.state.getState();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const type = (state.cardData as any)?.originalParams?.type || 'weapon';

                if (type === 'armor') {
                    this.state.updateCardData({ armorClass: val });
                } else {
                    // For weapons, update weaponDamage and clear deprecated damageType
                    this.state.updateCardData({ weaponDamage: val, damageType: '' });
                }
                this.state.saveCurrentCard();
            });
        }
    }

    setupSliderListeners() {
        // Front-side sliders - route to front.offsets
        const frontSliders: Record<string, string> = {
            'name-offset': 'name',
            'type-offset': 'type',
            'rarity-offset': 'rarity',
            'coreStats-offset': 'coreStats',
            'stats-offset': 'stats',
            'gold-offset': 'gold',
            'image-offset': 'imageYOffset',
            'image-scale': 'imageScale',
            'image-rotation': 'imageRotation',
            'image-fade': 'imageFade',
            'image-shadow': 'imageShadow',
            'bg-scale': 'backgroundScale',
            'center-fade': 'centerFade',
            'name-width': 'nameWidth',
            'type-width': 'typeWidth',
            'rarity-width': 'rarityWidth',
            'coreStats-width': 'coreStatsWidth',
            'stats-width': 'statsWidth',
            'gold-width': 'goldWidth'
        };

        // Back-side sliders - route to back.offsets
        const backSliders: Record<string, string> = {
            'ability-offset': 'abilityName',
            'mech-offset': 'mech',
            'lore-offset': 'lore',
            'ability-width': 'mechWidth',
            'lore-width': 'loreWidth'
        };

        // Combine all sliders
        const allSliders = { ...frontSliders, ...backSliders };

        Object.keys(allSliders).forEach(id => {
            const slider = document.getElementById(id) as HTMLInputElement | null;
            if (slider) {
                let rafId: number | null = null;
                slider.addEventListener('input', (e) => {
                    const target = e.target as HTMLInputElement;
                    const rawVal = target.value;

                    if (rafId) return;

                    rafId = requestAnimationFrame(() => {
                        const val = parseFloat(rawVal);

                        this.state.updateOffset(allSliders[id], val);

                        // Update displays
                        if (id.includes('scale')) {
                            const display = document.getElementById(`${id}-val`);
                            if (display) display.textContent = val.toFixed(1);
                        } else if (id.includes('rotation')) {
                            const display = document.getElementById(`${id}-val`);
                            if (display) display.textContent = `${val}°`;
                        } else if (id.includes('fade') || id.includes('shadow')) {
                            const display = document.getElementById(`${id}-val`);
                            if (display) display.textContent = String(val);
                        }

                        rafId = null;
                    });
                });

                // Save only when dragging stops
                slider.addEventListener('change', () => {
                    this.state.saveCurrentCard();
                });
            }
        });
    }

    setupGlobalMarginListeners() {
        const marginYSlider = document.getElementById('global-margin-y') as HTMLInputElement | null;
        const marginXSlider = document.getElementById('global-margin-x') as HTMLInputElement | null;
        const lockCheckbox = document.getElementById('global-margin-lock') as HTMLInputElement | null;
        const marginYDisplay = document.getElementById('global-margin-y-val');
        const marginXDisplay = document.getElementById('global-margin-x-val');

        if (!marginYSlider || !marginXSlider) return;

        // Card constants
        const CARD_CENTER = 525; // 1050 / 2

        // Store base values on first interaction
        let baseVerticalOffsets: Record<string, number> | null = null;
        let baseHorizontalWidths: Record<string, number> | null = null;

        // Base/Default positions of elements (absolute Y positions)
        // FRONT SIDE elements
        const frontVerticalBases: Record<string, number> = {
            'rarity': 100,
            'type': 140,
            'name': 200,
            'imageYOffset': 380, // Center of image area
            'coreStats': 680,
            'stats': 780,
            'gold': 920
        };

        // BACK SIDE elements
        const backVerticalBases: Record<string, number> = {
            'abilityName': 120,
            'mech': 180,
            'lore': 600
        };

        // Elements affected by horizontal compression (widths)
        const horizontalKeys = ['nameWidth', 'typeWidth', 'rarityWidth', 'coreStatsWidth', 'statsWidth', 'goldWidth'];
        const DEFAULT_WIDTH = 500;

        let rafId: number | null = null;

        // Capture base values when slider is first touched
        const captureBaseValues = () => {
            const verticalBases = this.isFlipped ? backVerticalBases : frontVerticalBases;

            if (!baseVerticalOffsets) {
                baseVerticalOffsets = {};
                Object.keys(verticalBases).forEach(key => {
                    baseVerticalOffsets![key] = this.state.getOffset(key) || 0;
                    // If undefined, initialize based on side (but imageYOffset is tricky since it's a relative offset)
                    if (baseVerticalOffsets![key] === undefined) {
                        // Logic handled by getOffset or fallback
                        baseVerticalOffsets![key] = 0;
                    }
                });
            }
            if (!baseHorizontalWidths) {
                baseHorizontalWidths = {};
                horizontalKeys.forEach(key => {
                    baseHorizontalWidths![key] = this.state.getOffset(key) || DEFAULT_WIDTH;
                });
            }
        };

        // Handle vertical compression/expansion
        marginYSlider.addEventListener('input', (e) => {
            captureBaseValues();
            const target = e.target as HTMLInputElement;
            const sliderValue = parseFloat(target.value);
            if (marginYDisplay) marginYDisplay.textContent = String(sliderValue);

            const verticalBases = this.isFlipped ? backVerticalBases : frontVerticalBases;
            const compressionFactor = sliderValue / 100; // -1 to 1

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                if (!baseVerticalOffsets) return;
                Object.keys(verticalBases).forEach(key => {
                    const baseOffset = baseVerticalOffsets![key];
                    const basePos = verticalBases[key];

                    // Current absolute position (base + saved offset)
                    // Note: imageYOffset, rarity, type, name, gold are relative to their base
                    // coreStats, stats are absolute Y themselves
                    let currentAbsPos;
                    if (['coreStats', 'stats', 'mech', 'lore', 'abilityName'].includes(key)) {
                        currentAbsPos = baseOffset;
                    } else {
                        currentAbsPos = basePos + baseOffset;
                    }

                    // Move proportional to distance from center
                    // If pos is 100 (top), distance is 100-525 = -425. Squeezing (factor > 0) should move it DOWN (+).
                    // movement = - (absPos - center) * factor * weight
                    const weight = 0.5; // Shared weight for uniform movement
                    const movement = -(currentAbsPos - CARD_CENTER) * compressionFactor * weight;

                    this.state.updateOffset(key, baseOffset + movement);
                });

                // If locked, sync Horizontal
                if (lockCheckbox && lockCheckbox.checked) {
                    if (marginXSlider) marginXSlider.value = String(sliderValue);
                    if (marginXDisplay) marginXDisplay.textContent = String(sliderValue);

                    horizontalKeys.forEach(key => {
                        const baseVal = baseHorizontalWidths![key];
                        const newVal = baseVal - (compressionFactor * 150);
                        this.state.updateOffset(key, Math.max(200, newVal));
                    });
                }

                rafId = null;
            });
        });

        // Handle horizontal compression/expansion
        marginXSlider.addEventListener('input', (e) => {
            captureBaseValues();
            const target = e.target as HTMLInputElement;
            const sliderValue = parseFloat(target.value);
            if (marginXDisplay) marginXDisplay.textContent = String(sliderValue);

            const compressionFactor = sliderValue / 100;

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                if (!baseHorizontalWidths) return;
                horizontalKeys.forEach(key => {
                    const baseVal = baseHorizontalWidths![key];
                    const newVal = baseVal - (compressionFactor * 150);
                    this.state.updateOffset(key, Math.max(200, newVal));
                });

                if (lockCheckbox && lockCheckbox.checked) {
                    if (marginYSlider) marginYSlider.value = String(sliderValue);
                    if (marginYDisplay) marginYDisplay.textContent = String(sliderValue);

                    const verticalBases = this.isFlipped ? backVerticalBases : frontVerticalBases;
                    Object.keys(verticalBases).forEach(key => {
                        const baseOffset = baseVerticalOffsets![key];
                        const basePos = verticalBases[key];
                        let currentAbsPos;
                        if (['coreStats', 'stats', 'mech', 'lore', 'abilityName'].includes(key)) {
                            currentAbsPos = baseOffset;
                        } else {
                            currentAbsPos = basePos + baseOffset;
                        }
                        const weight = 0.5;
                        const movement = -(currentAbsPos - CARD_CENTER) * compressionFactor * weight;
                        this.state.updateOffset(key, baseOffset + movement);
                    });
                }

                rafId = null;
            });
        });

        // Cleanup
        [marginYSlider, marginXSlider].forEach(slider => {
            slider.addEventListener('change', () => {
                baseVerticalOffsets = null;
                baseHorizontalWidths = null;
                this.state.saveCurrentCard();
            });
        });

        console.log('🎯 Proportional global compression initialized');
    }

    setupFontListeners() {
        // Font Family
        const fontFamilySelect = document.getElementById('font-family-select') as HTMLSelectElement | null;
        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                this.state.updateStyle('fontFamily', target.value);
            });
        }

        // Font Size Buttons
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = (btn as HTMLElement).dataset.target || '';
                const action = btn.classList.contains('font-increase') ? 1 : -1;
                this.state.updateFontSize(target, action);
            });
        });

        // Font Style Checkboxes (Bold/Italic/Shadow)
        const styleMap = [
            'name', 'type', 'rarity', 'coreStats', 'stats', 'gold', // Front
            'abilityName', 'mech', 'lore' // Back
        ];
        styleMap.forEach(key => {
            const boldId = `style-bold-${key}`;
            const italicId = `style-italic-${key}`;
            const shadowId = `style-shadow-${key}`;
            const glowId = `style-glow-${key}`; // NEW: Glow support

            const boldCb = document.getElementById(boldId) as HTMLInputElement | null;
            const italicCb = document.getElementById(italicId) as HTMLInputElement | null;
            const shadowCb = document.getElementById(shadowId) as HTMLInputElement | null;
            const glowCb = document.getElementById(glowId) as HTMLInputElement | null;

            if (boldCb) {
                boldCb.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    this.state.updateFontStyle(`${key}Bold`, target.checked);
                    this.state.saveCurrentCard();
                });
            }
            if (italicCb) {
                italicCb.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    this.state.updateFontStyle(`${key}Italic`, target.checked);
                    this.state.saveCurrentCard();
                });
            }
            if (shadowCb) {
                shadowCb.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    this.state.updateFontStyle(`${key}Shadow`, target.checked);
                    this.state.saveCurrentCard();
                });
            }
            if (glowCb) {
                glowCb.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    this.state.updateFontStyle(`${key}Glow`, target.checked);
                    this.state.saveCurrentCard();
                });
            }
        });

        // Image Style Options
        const styleOption = document.getElementById('image-style-option') as HTMLSelectElement | null;
        const colorContainer = document.getElementById('image-color-picker-container');

        if (styleOption && colorContainer) {
            styleOption.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                const val = target.value;
                this.state.updateStyle('imageStyle', val); // Update state!

                if (val === 'colored-background') {
                    colorContainer.classList.remove('hidden');
                } else {
                    colorContainer.classList.add('hidden');
                }
            });
        }

        // Text Effect Controls
        const outlineCheckbox = document.getElementById('text-outline-enabled') as HTMLInputElement | null;
        const outlineControls = document.getElementById('text-outline-controls');
        const outlineWidthSlider = document.getElementById('text-outline-width') as HTMLInputElement | null;
        const outlineWidthVal = document.getElementById('text-outline-width-val');

        const shadowCheckbox = document.getElementById('text-shadow-enabled') as HTMLInputElement | null;
        const shadowControls = document.getElementById('text-shadow-controls');
        const shadowBlurSlider = document.getElementById('text-shadow-blur') as HTMLInputElement | null;
        const shadowBlurVal = document.getElementById('text-shadow-blur-val');

        if (outlineCheckbox) {
            outlineCheckbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const enabled = target.checked;
                this.state.updateStyle('textOutlineEnabled', enabled);
                if (outlineControls) {
                    outlineControls.classList.toggle('hidden', !enabled);
                }
                this.state.saveCurrentCard();
            });
        }

        if (outlineWidthSlider) {
            outlineWidthSlider.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const val = parseInt(target.value);
                if (outlineWidthVal) outlineWidthVal.textContent = String(val);
                this.state.updateStyle('textOutlineWidth', val);
            });
            outlineWidthSlider.addEventListener('change', () => {
                this.state.saveCurrentCard();
            });
        }

        if (shadowCheckbox) {
            shadowCheckbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const enabled = target.checked;
                this.state.updateStyle('textShadowEnabled', enabled);
                if (shadowControls) {
                    shadowControls.classList.toggle('hidden', !enabled);
                }
                this.state.saveCurrentCard();
            });
        }

        if (shadowBlurSlider) {
            shadowBlurSlider.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const val = parseInt(target.value);
                if (shadowBlurVal) shadowBlurVal.textContent = String(val);
                this.state.updateStyle('textShadowBlur', val);
            });
            shadowBlurSlider.addEventListener('change', () => {
                this.state.saveCurrentCard();
            });
        }

        // Text Backdrop Controls
        const backdropCheckbox = document.getElementById('text-backdrop-enabled') as HTMLInputElement | null;
        const backdropControls = document.getElementById('text-backdrop-controls');
        const backdropOpacitySlider = document.getElementById('text-backdrop-opacity') as HTMLInputElement | null;
        const backdropOpacityVal = document.getElementById('text-backdrop-opacity-val');

        if (backdropCheckbox) {
            console.log('EditorController: Backdrop checkbox found!');
            backdropCheckbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const enabled = target.checked;
                console.log('EditorController: Backdrop checkbox changed:', enabled);
                this.state.updateStyle('textBackdropEnabled', enabled);
                if (backdropControls) {
                    backdropControls.classList.toggle('hidden', !enabled);
                }
                this.state.saveCurrentCard();
            });
        } else {
            console.warn('EditorController: Backdrop checkbox NOT found!');
        }

        if (backdropOpacitySlider) {
            backdropOpacitySlider.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const val = parseInt(target.value);
                if (backdropOpacityVal) backdropOpacityVal.textContent = val + '%';
                this.state.updateStyle('textBackdropOpacity', val);
            });
            backdropOpacitySlider.addEventListener('change', () => {
                this.state.saveCurrentCard();
            });
        }
    }

    setupTypeSelection() {
        const typeSelect = document.getElementById('item-type') as HTMLSelectElement | null;
        const noteType = document.getElementById('note-type') as HTMLElement | null;
        const noteSubtype = document.getElementById('note-subtype') as HTMLElement | null;
        const subtypeSelect = document.getElementById('item-subtype') as HTMLSelectElement | null;

        // Subtype listener removed to avoid conflict with GeneratorUIManager


        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                const selectedType = target.value;

                // Sticky Note updates removed to avoid conflict with GeneratorUIManager


                // Update Subtypes UI (Existing Logic)
                const subtypeContainer = document.getElementById('subtype-container');

                const OFFICIAL_ITEMS = (window as unknown as WindowGlobals).OFFICIAL_ITEMS;

                if (subtypeSelect && OFFICIAL_ITEMS[selectedType]) {
                    if (subtypeContainer) subtypeContainer.classList.remove('hidden');

                    // Get current locale
                    const i18n = (window as unknown as WindowGlobals).i18n;
                    const locale = i18n?.getLocale() || 'he';
                    const isHebrew = locale === 'he';

                    // Helper function to display item name based on locale
                    const getDisplayName = (fullName: string) => {
                        const match = fullName.match(/^(.+?)\s*\((.+)\)$/);
                        if (match) {
                            const [, englishName, hebrewName] = match;
                            // In Hebrew: show "HebrewName (EnglishName)"
                            // In English: show just "EnglishName"
                            return isHebrew ? `${hebrewName} (${englishName})` : englishName;
                        }
                        return fullName; // No parentheses, return as-is
                    };

                    const defaultText = isHebrew ? '-- בחר חפץ --' : '-- Select Item --';
                    subtypeSelect.innerHTML = `<option value="">${defaultText}</option>`;
                    const categories = OFFICIAL_ITEMS[selectedType];
                    for (const [category, items] of Object.entries(categories)) {
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = category;
                        (items as string[]).forEach((item: string) => {
                            const option = document.createElement('option');
                            option.value = item; // Keep original value for lookups
                            option.textContent = getDisplayName(item);
                            optgroup.appendChild(option);
                        });
                        subtypeSelect.appendChild(optgroup);
                    }
                } else if (subtypeContainer) {
                    subtypeContainer.classList.add('hidden');
                }


                // Toggle Weapon/Armor Fields
                const weaponFields = document.getElementById('weapon-fields');
                const armorFields = document.getElementById('armor-fields');
                if (weaponFields) weaponFields.classList.add('hidden');
                if (armorFields) armorFields.classList.add('hidden');

                if (selectedType === 'weapon' && weaponFields) weaponFields.classList.remove('hidden');
                else if (selectedType === 'armor' && armorFields) armorFields.classList.remove('hidden');
            });

            // Trigger initial change to populate UI if a value is already selected
            if (typeSelect.value) {
                typeSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    setupLevelSelection() {
        const levelSelect = document.getElementById('item-level') as HTMLSelectElement | null;
        const noteLevel = document.getElementById('note-level') as HTMLElement | null;

        if (levelSelect && noteLevel) {
            levelSelect.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                const val = target.value;
                noteLevel.textContent = val;
                noteLevel.dataset.value = val;
            });
        }
    }

    setupColorPalette() {
        const palette = document.getElementById('color-palette');
        const input = document.getElementById('image-bg-color') as HTMLInputElement | null;
        if (!palette || !input) return;

        const colors = [
            '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
            '#ffff00', '#00ffff', '#ff00ff', '#8b4513', '#808080',
            '#e6e6fa', '#f0f8ff', '#f5f5dc', '#ffe4e1'
        ];

        palette.innerHTML = '';
        colors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-swatch';
            div.style.backgroundColor = color;
            div.dataset.value = color;
            div.onclick = () => {
                // Remove active class from all
                palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                div.classList.add('active');
                input.value = color; // Store simple hex
                this.state.updateStyle('imageColor', color); // Update state!
            };
            palette.appendChild(div);
        });

        // Manual Color Input
        if (input) {
            input.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                this.state.updateStyle('imageColor', target.value);
            });
        }

        // Add custom color input logic if needed, but for now fixed palette
    }

    setupScrollNoteListeners() {
        // Helper function to update the scroll note
        const updateScrollNote = () => {
            const abilityInput = document.getElementById('item-ability') as HTMLInputElement | null;
            const styleSelect = document.getElementById('image-style') as HTMLSelectElement | null;
            const attunementCheckbox = document.getElementById('attunement') as HTMLInputElement | null;
            const damageInput = document.getElementById('weapon-damage') as HTMLInputElement | null;
            const acInput = document.getElementById('armor-class') as HTMLInputElement | null;
            const visualContextCheckbox = document.getElementById('use-visual-context') as HTMLInputElement | null;

            // Update ability
            const noteAbility = document.getElementById('note-ability');
            if (noteAbility && abilityInput) {
                const val = abilityInput.value.trim();
                noteAbility.textContent = val || '-';
                noteAbility.title = val;
            }

            // Update style
            const noteStyle = document.getElementById('note-style');
            if (noteStyle && styleSelect) {
                const selectedOption = styleSelect.options[styleSelect.selectedIndex];
                const text = selectedOption?.text?.split('(')[0].trim() || '-';
                noteStyle.textContent = text;
            }

            // Update visual context badge
            const noteVisualContext = document.getElementById('note-visual-context');
            if (noteVisualContext && visualContextCheckbox) {
                noteVisualContext.classList.toggle('hidden', !visualContextCheckbox.checked);
            }

            // Update attunement badge
            const noteAttunement = document.getElementById('note-attunement');
            if (noteAttunement && attunementCheckbox) {
                noteAttunement.classList.toggle('hidden', !attunementCheckbox.checked);
            }

            // Update damage badge
            const noteDamage = document.getElementById('note-damage');
            const typeSelect = document.getElementById('item-type') as HTMLSelectElement | null;
            if (noteDamage && damageInput) {
                const val = damageInput.value.trim();
                const isWeapon = typeSelect?.value === 'weapon';
                if (val && isWeapon) {
                    noteDamage.textContent = `⚔️ ${val}`;
                    noteDamage.classList.remove('hidden');
                } else {
                    noteDamage.classList.add('hidden');
                }
            }

            // Update AC badge
            const noteAC = document.getElementById('note-ac');
            if (noteAC && acInput) {
                const val = acInput.value.trim();
                const isArmor = typeSelect?.value === 'armor';
                if (val && isArmor) {
                    noteAC.textContent = `🛡️ AC ${val}`;
                    noteAC.classList.remove('hidden');
                } else {
                    noteAC.classList.add('hidden');
                }
            }
        };

        // Ability input
        const abilityInput = document.getElementById('item-ability') as HTMLInputElement | null;
        if (abilityInput) {
            abilityInput.addEventListener('input', updateScrollNote);
        }

        // Image style select
        const styleSelect = document.getElementById('image-style') as HTMLSelectElement | null;
        if (styleSelect) {
            styleSelect.addEventListener('change', updateScrollNote);
        }

        // Attunement checkbox
        const attunementCheckbox = document.getElementById('attunement') as HTMLInputElement | null;
        if (attunementCheckbox) {
            attunementCheckbox.addEventListener('change', updateScrollNote);
        }

        // Weapon damage input
        const damageInput = document.getElementById('weapon-damage') as HTMLInputElement | null;
        if (damageInput) {
            damageInput.addEventListener('input', updateScrollNote);
        }

        // Armor class input
        const acInput = document.getElementById('armor-class') as HTMLInputElement | null;
        if (acInput) {
            acInput.addEventListener('input', updateScrollNote);
        }

        // Also update when type changes (to show/hide damage and AC badges appropriately)
        const typeSelect = document.getElementById('item-type') as HTMLSelectElement | null;
        if (typeSelect) {
            typeSelect.addEventListener('change', updateScrollNote);
        }

        // Visual context checkbox
        const visualContextCheckbox = document.getElementById('use-visual-context') as HTMLInputElement | null;
        if (visualContextCheckbox) {
            visualContextCheckbox.addEventListener('change', updateScrollNote);
        }

        // Initial update
        setTimeout(updateScrollNote, 500);

        console.log('📜 Scroll note listeners initialized');
    }
}
