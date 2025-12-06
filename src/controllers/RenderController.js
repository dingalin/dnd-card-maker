export class RenderController {
    constructor(stateManager, renderer) {
        this.state = stateManager;
        this.renderer = renderer;
        this.init();
    }

    init() {
        // Subscribe to state changes
        this.state.subscribe((state, changedKey) => {
            this.handleStateChange(state, changedKey);
        });

        this.setupDownloadListener();
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
        // Use Delegation for robustness
        document.addEventListener('click', (e) => {
            // Download Button
            const downloadBtn = e.target.closest('#download-btn');
            if (downloadBtn && !downloadBtn.disabled) {
                console.log("🖱️ Download button clicked");
                e.preventDefault();
                let cardName = this.state.getState().cardData?.name || 'card';
                cardName = cardName.replace(/[^a-zA-Z0-9\u0590-\u05FF\-_ ]/g, "").trim();
                if (!cardName) cardName = "dnd_card";
                this.renderer.downloadCard(cardName).then(() => {
                    if (window.uiManager) window.uiManager.showToast(`התהליך הסתיים!`, 'info');
                });
            }

            // Save to Gallery Button
            const galleryBtn = e.target.closest('#save-gallery-btn');
            if (galleryBtn && !galleryBtn.disabled) {
                console.log("🖱️ Save to Gallery button clicked");
                e.preventDefault();

                // Generate Thumbnail from Canvas
                const canvas = document.getElementById('card-canvas');
                let thumbUrl = null;
                if (canvas) {
                    try {
                        // Create a small thumbnail (e.g. 20% scale or fixed width)
                        // We'll use the full canvas toDataURL but usually browsers handle it fine.
                        // To save space, we can draw to a smaller canvas first.
                        const thumbCanvas = document.createElement('canvas');
                        const scale = 0.3; // 30% size
                        thumbCanvas.width = canvas.width * scale;
                        thumbCanvas.height = canvas.height * scale;
                        const ctx = thumbCanvas.getContext('2d');
                        ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
                        thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
                    } catch (err) {
                        console.error("Failed to generate thumbnail:", err);
                    }
                }

                this.state.saveToHistory(thumbUrl);
                if (window.uiManager) window.uiManager.showToast('הקלף נשמר לגלריה בהצלחה!', 'success');
            }
        });
    }

    handleStateChange(state, changedKey) {
        if (changedKey === 'cardData') {
            this.updateEditor(state.cardData);
            this.render(state); // Render updates buttons now
        } else if (changedKey.startsWith('cardData.')) {
            // Single field update (e.g. typing in editor), just render
            this.render(state);
        } else if (changedKey.startsWith('settings.')) {
            // Slider/Style update
            this.render(state);
            this.updateSettingsUI(state.settings);
        }
    }



    async render(state) {
        if (!state.cardData || !this.renderer) return;

        // Check for background update
        if (state.settings.style.cardBackgroundUrl &&
            state.settings.style.cardBackgroundUrl !== this.currentBackgroundUrl) {

            console.log("RenderController: Loading new background from state...");
            await this.renderer.setTemplate(state.settings.style.cardBackgroundUrl);
            this.currentBackgroundUrl = state.settings.style.cardBackgroundUrl;
        }

        const renderOptions = {
            ...state.settings.offsets,
            fontSizes: state.settings.fontSizes,
            fontFamily: state.settings.style.fontFamily,
            imageStyle: state.settings.style.imageStyle,
            imageColor: state.settings.style.imageColor
        };

        if (window.previewManager) {
            // Notify preview manager if needed (e.g. for zoom/pan updates)
        }

        await this.renderer.render(state.cardData, renderOptions);

        this.updateButtons(state.cardData);
    }

    updateButtons(cardData) {
        const hasData = !!cardData;
        const downBtn = document.getElementById('download-btn');
        const galBtn = document.getElementById('save-gallery-btn');

        if (downBtn) downBtn.disabled = !hasData;
        if (galBtn) galBtn.disabled = !hasData;
    }

    updateEditor(data) {
        if (!data) return;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setVal('edit-name', data.name);
        setVal('edit-type', data.typeHe);
        setVal('edit-rarity', data.rarityHe);
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

        // Update Custom Prompt if it exists in state but not input? 
        // Logic usually flows Input -> State, so we only update Input -> State here if we loaded a fresh card.
    }

    updateSettingsUI(settings) {
        if (settings.offsets) {
            const setDisplay = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };
            setDisplay('image-scale-val', settings.offsets.imageScale?.toFixed(1));
            setDisplay('edit-image-scale-val', settings.offsets.imageScale?.toFixed(1));
            setDisplay('image-rotation-val', `${settings.offsets.imageRotation}°`);
            setDisplay('edit-image-rotation-val', `${settings.offsets.imageRotation}°`);

            // Sync sliders
            const setSlider = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            // setSlider('image-scale', settings.offsets.imageScale); // Example
        }

        // Update Font Size Displays
        if (settings.fontSizes) {
            for (const [key, value] of Object.entries(settings.fontSizes)) {
                const display = document.getElementById(`${key}-display`);
                if (display) display.textContent = `${value}px`;
            }
        }
    }
}
