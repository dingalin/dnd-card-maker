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
    }

    handleStateChange(state, changedKey) {
        // If card data changed, update editor fields to match
        if (changedKey === 'cardData') {
            this.updateEditor(state.cardData);
            this.render(state);
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
