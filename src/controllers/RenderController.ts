// @ts-nocheck
import { StateManager, AppState } from '../state';
import { I18nService } from '../i18n';

// Helper interface for globals
interface WindowGlobals {
    i18n?: I18nService;
    uiManager?: any;
    cardRenderer?: any;
}

export class RenderController {
    private state: StateManager;
    private renderer: any; // CardRenderer (JS)
    private backRenderer: any; // CardRenderer (JS)
    private isFlipped: boolean;
    private isSplitView: boolean;
    private isRendering: boolean = false;
    private pendingState: AppState | null = null;
    private currentBackgroundUrl: string | null = null;

    constructor(stateManager: StateManager, renderer: any, backRenderer: any = null) {
        this.state = stateManager;
        this.renderer = renderer;
        this.backRenderer = backRenderer;
        this.isFlipped = false;
        this.isSplitView = false;
        this.init();
    }

    init() {
        // Subscribe to state changes
        this.state.subscribe((state: AppState, changedKey: string) => {
            this.handleStateChange(state, changedKey);
        });

        this.setupDownloadListener();
        this.setupSplitViewControls(); // Setup Split View UI
        this.setupEquipListener();     // Setup Equip UI

        // Listen for Flip Event
        document.addEventListener('card-flip', (e: any) => {
            console.log("RenderController: Card Flip Event", e.detail);
            this.isFlipped = e.detail.isFlipped;
            const currentState = this.state.getState();
            if (currentState) {
                this.render(currentState);
            }
        });
    }

    handleStateChange(state: AppState, changedKey: string) {
        if (!state || !state.cardData) return;

        if (changedKey === 'cardData') {
            this.updateEditor(state.cardData);
            this.updateSettingsUI(state.settings); // Sync sliders on full load
            this.render(state); // Render updates buttons now
        } else if (changedKey.startsWith('cardData.')) {
            // Single field update (e.g. typing in editor), just render
            this.render(state);
        } else if (changedKey === 'settings' || changedKey.startsWith('settings.')) {
            // Settings update (including resetToDefaults which sends 'settings')
            this.render(state);
            this.updateSettingsUI(state.settings);
        }
    }

    async render(state: AppState) {
        if (!state.cardData || !this.renderer) return;

        // Render Lock: Prevent concurrent renders
        if (this.isRendering) {
            this.pendingState = state; // Queue the latest state
            return;
        }

        this.isRendering = true;

        try {
            // Ensure background is loaded for backRenderer if disjoint
            if (this.currentBackgroundUrl && this.backRenderer && !this.backRenderer.templateLoaded) {
                await this.backRenderer.setTemplate(this.currentBackgroundUrl);
            }

            // Check for background update
            if (state.settings.style?.cardBackgroundUrl &&
                state.settings.style.cardBackgroundUrl !== this.currentBackgroundUrl) {

                console.log("RenderController: Loading new background from state...");
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.renderer.setTemplate(state.settings.style.cardBackgroundUrl);
                // Wait for the template to fully load before proceeding
                await this.renderer.templateReady;

                if (this.backRenderer) {
                    this.backRenderer.setTemplate(state.settings.style.cardBackgroundUrl);
                    await this.backRenderer.templateReady;
                }
                this.currentBackgroundUrl = state.settings.style.cardBackgroundUrl as string;

                // Set context for AI visual generation
                if (window.stateManager && state.settings.style.cardBackgroundUrl) {
                    window.stateManager.setLastContext(state.settings.style.cardBackgroundUrl);
                }

                console.log("RenderController: New background loaded, proceeding with render");
            }

            // Select settings based on current side
            const isFlipped = state.isFlipped || this.isFlipped;
            const sideSettings = isFlipped ? state.settings.back : state.settings.front;

            // Safe access to style object (may not exist in old saved cards)
            const style = state.settings.style || {};

            const renderOptions = {
                ...sideSettings.offsets,
                fontSizes: sideSettings.fontSizes,
                fontStyles: sideSettings.fontStyles,

                // IMPORTANT: backgroundScale should ALWAYS come from front.offsets
                // This ensures both sides of the card have the same background size
                backgroundScale: state.settings.front?.offsets?.backgroundScale ?? 1.0,

                // Helper to ensure critical Widths are present if not in offsets
                nameWidth: sideSettings.offsets.nameWidth || 500,
                typeWidth: sideSettings.offsets.typeWidth || 500,
                rarityWidth: sideSettings.offsets.rarityWidth || 500,
                coreStatsWidth: sideSettings.offsets.coreStatsWidth || 500,
                statsWidth: sideSettings.offsets.statsWidth || 500,
                goldWidth: sideSettings.offsets.goldWidth || 500,
                mechWidth: sideSettings.offsets.mechWidth || 600,
                loreWidth: sideSettings.offsets.loreWidth || 550,

                fontFamily: style.fontFamily || 'Heebo',
                imageStyle: style.imageStyle || 'natural',
                imageColor: style.imageColor || '#ffffff',

                // Text effects
                textOutlineEnabled: style.textOutlineEnabled || false,
                textOutlineWidth: style.textOutlineWidth || 2,
                textShadowEnabled: style.textShadowEnabled || false,
                textShadowBlur: style.textShadowBlur || 4,
                textBackdropEnabled: style.textBackdropEnabled || false,
                textBackdropOpacity: style.textBackdropOpacity || 40,

                // Extra
                useLocalImage: state.cardData.useLocalImage,
                localImageBase64: state.cardData.localImageBase64
            };

            // NORMALIZE DATA FOR RENDERERS (V2 -> V1 View Model)
            // Renderers expect flat structure (name, typeHe, rarityHe, abilityName, etc.)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = state.cardData as any;
            const renderData = raw.front ? {
                ...raw,
                // Map Front
                name: raw.front.title,
                typeHe: raw.front.type,
                rarityHe: raw.front.rarity,
                gold: raw.front.gold,
                imageUrl: raw.front.imageUrl,
                quickStats: raw.front.quickStats,
                // Map Back
                abilityName: raw.back?.title,
                abilityDesc: raw.back?.mechanics,
                description: raw.back?.lore
            } : raw;

            if (this.isSplitView && this.backRenderer) {
                // 1. Render Front
                await this.renderer.render(renderData, {
                    ...renderOptions,
                    ...state.settings.front.offsets, // Ensure front offsets
                    fontSizes: state.settings.front.fontSizes,
                    fontStyles: state.settings.front.fontStyles
                }, false); // Force Front

                // 2. Render Back (use backgroundScale from front so both sides match)
                await this.backRenderer.render(renderData, {
                    ...renderOptions,
                    ...state.settings.back.offsets, // Ensure back offsets
                    backgroundScale: state.settings.front?.offsets?.backgroundScale ?? 1.0, // Use FRONT's backgroundScale for consistency
                    fontSizes: state.settings.back.fontSizes,
                    fontStyles: state.settings.back.fontStyles
                }, true); // Force Back

            } else {
                // Normal Single View
                await this.renderer.render(renderData, renderOptions, isFlipped);
            }

            this.updateButtons(state.cardData);

        } catch (e) {
            console.error("RenderController: Error during render loop", e);
        } finally {
            this.isRendering = false;
            // If a new state arrived while we were rendering, process it now
            if (this.pendingState) {
                const nextState = this.pendingState;
                this.pendingState = null;
                this.render(nextState);
            }
        }
    }

    updateButtons(cardData: any) {
        const hasData = !!cardData;
        const downBtn = document.getElementById('download-btn') as HTMLButtonElement | null;
        const galBtn = document.getElementById('save-gallery-btn') as HTMLButtonElement | null;

        if (downBtn) downBtn.disabled = !hasData;
        if (galBtn) galBtn.disabled = !hasData;
    }

    updateEditor(rawData: any) {
        if (!rawData) return;

        // --- V2 Data Normalization (Same as CardRenderer.render) ---
        const data = rawData.front ? {
            ...rawData,
            name: rawData.front.title,
            typeHe: rawData.front.type,
            rarityHe: rawData.front.rarity,
            gold: rawData.front.gold,
            imageUrl: rawData.front.imageUrl,
            abilityName: rawData.back?.title || '',
            abilityDesc: rawData.back?.mechanics || '',
            description: rawData.back?.lore || ''
        } : rawData;

        const setVal = (id: string, val: string) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (el) {
                el.value = val || '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        };

        setVal('edit-name', data.name);
        setVal('edit-type', data.typeHe);
        setVal('edit-rarity', data.rarityHe);
        setVal('edit-quick-stats', rawData.front?.quickStats || data.quickStats || '');
        setVal('edit-ability-name', data.abilityName);
        setVal('edit-ability-desc', data.abilityDesc);
        setVal('edit-desc', data.description);
        setVal('edit-gold', data.gold);

        // Update Font Size Displays
        if (data.fontSizes) {
            for (const [key, value] of Object.entries(data.fontSizes)) {
                const display = document.getElementById(`${key}-display`);
                if (display) display.textContent = `${value}px`;
            }
        }

        // Restore Generation Params
        if (data.originalParams) {
            const params = data.originalParams;
            const setNote = (id: string, val: string, display?: string) => {
                const el = document.getElementById(id);
                if (el) {
                    el.dataset.value = val;
                    el.textContent = display || val;
                }
            };

            setNote('note-level', params.level);
            setNote('note-type', params.type);

            let subtypeDisplay = params.subtype;
            if (subtypeDisplay && subtypeDisplay.includes('(')) {
                subtypeDisplay = subtypeDisplay.split('(')[0].trim();
            }
            setNote('note-subtype', params.subtype, subtypeDisplay);

            const setInput = (id: string, val: string) => {
                const el = document.getElementById(id) as HTMLInputElement | null;
                if (el) el.value = val;
            };
            setInput('item-level', params.level);
            setInput('item-type', params.type);
        }
    }

    updateSettingsUI(settings: any) {
        const setDisplay = (id: string, val: any) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };

        const setSlider = (id: string, val: any) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (el && val !== undefined) el.value = String(val);
        };

        // Sync FRONT side offsets
        if (settings.front?.offsets) {
            const fo = settings.front.offsets;
            setDisplay('image-scale-val', fo.imageScale?.toFixed(1));
            setDisplay('edit-image-scale-val', fo.imageScale?.toFixed(1));
            setDisplay('image-rotation-val', `${fo.imageRotation}°`);
            setDisplay('edit-image-rotation-val', `${fo.imageRotation}°`);

            setSlider('image-scale', fo.imageScale);
            setSlider('image-rotation', fo.imageRotation);
            setSlider('image-fade', fo.imageFade);
            setSlider('image-shadow', fo.imageShadow);
            setSlider('bg-scale', fo.backgroundScale);
            setSlider('center-fade', fo.centerFade);
            setDisplay('center-fade-val', fo.centerFade || 0);
            setSlider('image-offset', fo.imageYOffset);
            setSlider('rarity-offset', fo.rarity);
            setSlider('type-offset', fo.type);
            setSlider('name-offset', fo.name);
            setSlider('coreStats-offset', fo.coreStats);
            setSlider('stats-offset', fo.stats);
            setSlider('gold-offset', fo.gold);
            setSlider('name-width', fo.nameWidth);
            setSlider('type-width', fo.typeWidth);
            setSlider('rarity-width', fo.rarityWidth);
            setSlider('coreStats-width', fo.coreStatsWidth);
            setSlider('stats-width', fo.statsWidth);
            setSlider('gold-width', fo.goldWidth);
        }

        // Sync BACK side offsets
        if (settings.back?.offsets) {
            const bo = settings.back.offsets;
            setSlider('ability-offset', bo.abilityName);
            setSlider('mech-offset', bo.mech);
            setSlider('lore-offset', bo.lore);
            setSlider('ability-width', bo.mechWidth);
            setSlider('lore-width', bo.loreWidth);
        }

        // Update Font Size Displays - FRONT
        if (settings.front?.fontSizes) {
            for (const [key, value] of Object.entries(settings.front.fontSizes)) {
                const display = document.getElementById(`${key}-display`);
                if (display) display.textContent = `${value}px`;
            }
        }

        // Update Font Size Displays - BACK
        if (settings.back?.fontSizes) {
            for (const [key, value] of Object.entries(settings.back.fontSizes)) {
                const display = document.getElementById(`${key}-display`);
                if (display) display.textContent = `${value}px`;
            }
        }

        // Update Font Styles - FRONT
        if (settings.front?.fontStyles) {
            this.updateFontStyles(settings.front.fontStyles);
        }

        // Update Font Styles - BACK
        if (settings.back?.fontStyles) {
            this.updateFontStyles(settings.back.fontStyles);
        }

        // Sync Image Style & Color
        if (settings.style) {
            const styleOption = document.getElementById('image-style-option') as HTMLSelectElement | null;
            if (styleOption && settings.style.imageStyle) {
                styleOption.value = settings.style.imageStyle;
                const colorContainer = document.getElementById('image-color-picker-container');
                if (colorContainer) {
                    if (settings.style.imageStyle === 'colored-background') {
                        colorContainer.classList.remove('hidden');
                    } else {
                        colorContainer.classList.add('hidden');
                    }
                }
            }

            const colorInput = document.getElementById('image-bg-color') as HTMLInputElement | null;
            if (colorInput && settings.style.imageColor) {
                colorInput.value = settings.style.imageColor;
                const palette = document.getElementById('color-palette');
                if (palette) {
                    palette.querySelectorAll('.color-swatch').forEach(s => {
                        if ((s as HTMLElement).dataset.value === settings.style.imageColor) s.classList.add('active');
                        else s.classList.remove('active');
                    });
                }
            }

            const fontFamilySelect = document.getElementById('font-family-select') as HTMLSelectElement | null;
            if (fontFamilySelect && settings.style.fontFamily) {
                fontFamilySelect.value = settings.style.fontFamily;
            }

            // Text Effects
            const outlineCheckbox = document.getElementById('text-outline-enabled') as HTMLInputElement | null;
            const outlineWidthSlider = document.getElementById('text-outline-width') as HTMLInputElement | null;
            const outlineControls = document.getElementById('text-outline-controls');
            const outlineWidthVal = document.getElementById('text-outline-width-val');

            if (outlineCheckbox) {
                outlineCheckbox.checked = !!settings.style.textOutlineEnabled;
                if (outlineControls) {
                    outlineControls.classList.toggle('hidden', !settings.style.textOutlineEnabled);
                }
            }
            if (outlineWidthSlider && settings.style.textOutlineWidth !== undefined) {
                outlineWidthSlider.value = String(settings.style.textOutlineWidth);
                if (outlineWidthVal) outlineWidthVal.textContent = String(settings.style.textOutlineWidth);
            }

            const shadowCheckbox = document.getElementById('text-shadow-enabled') as HTMLInputElement | null;
            const shadowBlurSlider = document.getElementById('text-shadow-blur') as HTMLInputElement | null;
            const shadowControls = document.getElementById('text-shadow-controls');
            const shadowBlurVal = document.getElementById('text-shadow-blur-val');

            if (shadowCheckbox) {
                shadowCheckbox.checked = !!settings.style.textShadowEnabled;
                if (shadowControls) {
                    shadowControls.classList.toggle('hidden', !settings.style.textShadowEnabled);
                }
            }
            if (shadowBlurSlider && settings.style.textShadowBlur !== undefined) {
                shadowBlurSlider.value = String(settings.style.textShadowBlur);
                if (shadowBlurVal) shadowBlurVal.textContent = String(settings.style.textShadowBlur);
            }
        }
    }

    updateFontStyles(fontStyles: any) {
        for (const [key, value] of Object.entries(fontStyles)) {
            let type = '';
            let base = '';
            if (key.endsWith('Bold')) {
                type = 'bold';
                base = key.replace('Bold', '');
            } else if (key.endsWith('Italic')) {
                type = 'italic';
                base = key.replace('Italic', '');
            } else if (key.endsWith('Glow')) {
                type = 'glow';
                base = key.replace('Glow', '');
            }

            if (type && base) {
                const id = `style-${type}-${base}`;
                const cb = document.getElementById(id) as HTMLInputElement | null;
                if (cb) cb.checked = !!value;
            }
        }
    }

    setupSplitViewControls() {
        const splitBtn = document.getElementById('split-view-btn');
        const container = document.querySelector('.canvas-container');
        const frontCanvas = document.getElementById('card-canvas');
        const backCanvas = document.getElementById('card-canvas-back');

        if (splitBtn && container && frontCanvas && backCanvas) {
            splitBtn.addEventListener('click', () => {
                this.toggleSplitView();
            });

            frontCanvas.addEventListener('click', (e) => {
                if (this.isSplitView) {
                    const isActive = frontCanvas.classList.contains('active-canvas');
                    if (!isActive) {
                        this.setActiveCanvas('front');
                        e.stopPropagation(); // Prevent zoom
                    }
                }
            });

            backCanvas.addEventListener('click', (e) => {
                if (this.isSplitView) {
                    const isActive = backCanvas.classList.contains('active-canvas');
                    if (!isActive) {
                        this.setActiveCanvas('back');
                        e.stopPropagation(); // Prevent zoom
                    }
                }
            });
        }
    }

    toggleSplitView() {
        this.isSplitView = !this.isSplitView;
        const container = document.querySelector('.canvas-container') as HTMLElement;
        const backCanvas = document.getElementById('card-canvas-back') as HTMLElement;
        const splitBtn = document.getElementById('split-view-btn');
        const flipBtn = document.getElementById('flip-card-btn');
        const i18n = (window as unknown as WindowGlobals).i18n;

        if (this.isSplitView) {
            container.classList.add('split-view');
            backCanvas.classList.remove('hidden');
            if (splitBtn) {
                splitBtn.textContent = i18n?.t('preview.splitViewActive') || '📄 Split (Active)';
                splitBtn.classList.add('active');
            }
            if (flipBtn) flipBtn.classList.add('hidden');

            this.setActiveCanvas(this.isFlipped ? 'back' : 'front');
        } else {
            container.classList.remove('split-view');
            backCanvas.classList.add('hidden');
            if (splitBtn) {
                splitBtn.textContent = i18n?.t('preview.splitView') || '📄|📄 Split';
                splitBtn.classList.remove('active');
            }
            if (flipBtn) flipBtn.classList.remove('hidden');

            document.getElementById('card-canvas')?.classList.remove('active-canvas', 'inactive-canvas');
            backCanvas.classList.remove('active-canvas', 'inactive-canvas');
        }

        const currentState = this.state.getState();
        if (currentState) this.render(currentState);
    }

    setActiveCanvas(side: 'front' | 'back') {
        const frontCanvas = document.getElementById('card-canvas') as HTMLElement;
        const backCanvas = document.getElementById('card-canvas-back') as HTMLElement;

        this.isFlipped = (side === 'back');

        if (side === 'front') {
            frontCanvas.classList.add('active-canvas');
            frontCanvas.classList.remove('inactive-canvas');
            backCanvas.classList.add('inactive-canvas');
            backCanvas.classList.remove('active-canvas');
            this.switchSidebarControls('front');
        } else {
            backCanvas.classList.add('active-canvas');
            backCanvas.classList.remove('inactive-canvas');
            frontCanvas.classList.add('inactive-canvas');
            frontCanvas.classList.remove('active-canvas');
            this.switchSidebarControls('back');
        }
    }

    switchSidebarControls(side: 'front' | 'back') {
        const frontControls = document.getElementById('front-controls');
        const backControls = document.getElementById('back-controls');

        if (frontControls && backControls) {
            if (side === 'front') {
                frontControls.classList.remove('hidden');
                backControls.classList.add('hidden');
            } else {
                frontControls.classList.add('hidden');
                backControls.classList.remove('hidden');
            }
        }
    }

    setupDownloadListener() {
        // Validation: Check if button exists
        const btn = document.getElementById('download-btn');
        if (btn) {
            console.log("✅ Download button found in DOM");
        } else {
            console.warn("⚠️ Download button NOT found in DOM at init");
        }

        // Use Delegation for robustness
        document.addEventListener('click', (e: any) => {
            // Download Button
            const downloadBtn = e.target.closest('#download-btn') as HTMLButtonElement | null;
            if (downloadBtn && !downloadBtn.disabled) {
                console.log("🖱️ Download button clicked");
                e.preventDefault();
                let cardName = this.state.getState().cardData?.name || 'card';
                cardName = cardName.replace(/[^a-zA-Z0-9\u0590-\u05FF\-_ ]/g, "").trim();
                if (!cardName) cardName = "dnd_card";
                this.renderer.downloadCard(cardName).then(() => {
                    const uiManager = (window as unknown as WindowGlobals).uiManager;
                    const i18n = (window as unknown as WindowGlobals).i18n;
                    if (uiManager) uiManager.showToast(i18n?.t('toasts.processComplete') || 'Process complete!', 'info');
                });
            }

            // Save to Gallery Button
            const galleryBtn = e.target.closest('#save-gallery-btn') as HTMLButtonElement | null;
            if (galleryBtn && !galleryBtn.disabled) {
                console.log("🖱️ Save to Gallery button clicked");
                e.preventDefault();

                // Generate Thumbnail from Canvas
                const canvas = document.getElementById('card-canvas') as HTMLCanvasElement | null;
                let thumbUrl = null;
                if (canvas) {
                    try {
                        const thumbCanvas = document.createElement('canvas');
                        const scale = 0.6; // Higher resolution (60% size)
                        thumbCanvas.width = canvas.width * scale;
                        thumbCanvas.height = canvas.height * scale;
                        const ctx = thumbCanvas.getContext('2d', { willReadFrequently: true });
                        if (ctx) {
                            ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
                            thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
                        }
                    } catch (err) {
                        console.error("Failed to generate thumbnail:", err);
                    }
                }

                this.state.saveToHistory(thumbUrl);
                const uiManager = (window as unknown as WindowGlobals).uiManager;
                const i18n = (window as unknown as WindowGlobals).i18n;
                if (uiManager) uiManager.showToast(i18n?.t('toasts.cardSaved') || 'Card saved!', 'success');
            }
        });
    }

    setupEquipListener() {
        // Event Delegation for Equip Button
        document.addEventListener('click', async (e: any) => {
            const equipBtn = e.target.closest('#equip-item-btn');
            if (equipBtn) {
                e.preventDefault();

                const currentState = this.state.getState();
                const cardData = currentState.cardData;
                const i18n = (window as unknown as WindowGlobals).i18n;
                const uiManager = (window as unknown as WindowGlobals).uiManager;

                if (!cardData) {
                    if (uiManager) uiManager.showToast(i18n?.t('toasts.noCardData') || 'No card data', 'error');
                    return;
                }

                // Capture Canvas (Front Side)
                const canvas = document.getElementById('card-canvas') as HTMLCanvasElement | null;
                if (canvas) {
                    try {
                        // Create a high-quality snapshot of front
                        const frontImageUrl = canvas.toDataURL('image/png', 1.0);

                        // Capture back image - ENSURE it's rendered first!
                        let backImageUrl = null;
                        const backCanvasEl = document.getElementById('card-canvas-back') as HTMLCanvasElement | null;
                        if (backCanvasEl && (cardData.back || cardData.abilityName || cardData.abilityDesc)) {
                            try {
                                // IMPORTANT: Render the back canvas explicitly before capturing
                                // This ensures we have a proper image even if user didn't use split view
                                if (this.backRenderer) {
                                    const currentSettings = currentState.settings;
                                    const style = currentSettings.style || {};
                                    const backSettings = currentSettings.back || { fontSizes: {} as any, fontStyles: {}, offsets: {} as any };

                                    // NORMALIZE V2 -> V1 for renderer (same as in render() method)
                                    const raw = cardData as any;
                                    const renderData = raw.front ? {
                                        ...raw,
                                        name: raw.front.title,
                                        typeHe: raw.front.type,
                                        rarityHe: raw.front.rarity,
                                        gold: raw.front.gold,
                                        imageUrl: raw.front.imageUrl,
                                        quickStats: raw.front.quickStats,
                                        abilityName: raw.back?.title,
                                        abilityDesc: raw.back?.mechanics,
                                        description: raw.back?.lore
                                    } : raw;

                                    await this.backRenderer.render(renderData, {
                                        ...backSettings.offsets,
                                        backgroundScale: currentSettings.front?.offsets?.backgroundScale ?? 1.0, // Use FRONT's backgroundScale
                                        fontSizes: backSettings.fontSizes,
                                        fontStyles: backSettings.fontStyles,
                                        fontFamily: style.fontFamily || 'Heebo',
                                        textOutlineEnabled: style.textOutlineEnabled || false,
                                        textOutlineWidth: style.textOutlineWidth || 2,
                                        textShadowEnabled: style.textShadowEnabled || false,
                                        textShadowBlur: style.textShadowBlur || 4,
                                    }, true); // Force render as BACK side

                                    console.log('📸 Rendered back canvas before capture');
                                }

                                backImageUrl = backCanvasEl.toDataURL('image/png', 1.0);
                                console.log('📸 Captured back image from back-canvas');
                            } catch (e) {
                                console.error('Could not capture back canvas:', e);
                            }
                        }

                        // Dispatch Request for CharacterController to handle logic
                        document.dispatchEvent(new CustomEvent('request-character-equip-item', {
                            detail: {
                                cardData: { ...cardData, capturedBackImage: backImageUrl },
                                imageUrl: frontImageUrl,
                                backImageUrl: backImageUrl,
                                isRenderedCard: true
                            }
                        }));

                    } catch (err) {
                        console.error("Failed to capture card for equipment:", err);
                        if (uiManager) uiManager.showToast(i18n?.t('toasts.exportError') || 'Export error', 'error');
                    }
                }
            }
        });
    }
}
