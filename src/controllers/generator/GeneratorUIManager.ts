import { UIManager, StickyNoteOptions } from '../../ui/UIManager';

// Extend Window interface
declare global {
    interface Window {
        i18n?: {
            t: (key: string) => string;
            getLocale: () => string;
        };
    }
}

// Types
interface GeneratorController {
    onGenerate: (e: Event) => void;
    onRegenerateImage: () => void;
    onRegenerateStats: () => void;
    onGenerateBackground: () => void;
    onSurprise: (e: Event) => void;
    onAutoLayout: () => void;
    onLassoTool: () => void;
}

interface PreviewManager {
    updateProgress: (step: number, percent: number, message: string) => void;
    resetProgress: () => void;
}

interface NoteUIOptions extends StickyNoteOptions {
    subtypeText?: string;
}

interface GenerationParams {
    type: string;
    subtype: string;
    level: string;
    ability: string;
    complexityMode: string;
    useVisualContext: boolean;
    overrides: {
        attunement: boolean;
        weaponDamage: string;
        armorClass: string;
        customVisualPrompt: string;
    };
}

export class GeneratorUIManager {
    private controller: GeneratorController;
    private globalUI: UIManager;
    private preview: PreviewManager;

    constructor(controller: GeneratorController, uiManager: UIManager, previewManager: PreviewManager) {
        this.controller = controller;
        this.globalUI = uiManager;
        this.preview = previewManager;
    }

    setupListeners(): void {
        const form = document.getElementById('generator-form');
        const regenImageBtn = document.getElementById('regen-image-btn');
        const regenStatsBtn = document.getElementById('regen-stats-btn');
        const generateBgBtn = document.getElementById('generate-bg-btn');
        const surpriseBtn = document.getElementById('surprise-btn');
        const autoLayoutBtn = document.getElementById('auto-layout-btn');
        const lassoBtn = document.getElementById('lasso-tool-btn');

        if (form) form.addEventListener('submit', (e) => this.controller.onGenerate(e));
        if (regenImageBtn) regenImageBtn.addEventListener('click', () => this.controller.onRegenerateImage());
        if (regenStatsBtn) regenStatsBtn.addEventListener('click', () => this.controller.onRegenerateStats());
        if (generateBgBtn) generateBgBtn.addEventListener('click', () => this.controller.onGenerateBackground());
        if (surpriseBtn) surpriseBtn.addEventListener('click', (e) => this.controller.onSurprise(e));
        if (autoLayoutBtn) autoLayoutBtn.addEventListener('click', () => this.controller.onAutoLayout());
        if (lassoBtn) lassoBtn.addEventListener('click', () => this.controller.onLassoTool());

        this.setupFormListeners();
    }

    setupFormListeners(): void {
        // Real-time updates for Sticky Note
        const levelSelect = document.getElementById('item-level') as HTMLSelectElement | null;
        const typeSelect = document.getElementById('item-type') as HTMLSelectElement | null;
        const subtypeSelect = document.getElementById('item-subtype') as HTMLSelectElement | null;
        const abilityInput = document.getElementById('item-ability') as HTMLInputElement | null;

        const updateSticky = (): void => {
            const level = levelSelect?.value || '';
            const type = typeSelect?.value || '';
            const subtype = subtypeSelect?.value || '';

            // Get selected text for subtype to show Hebrew name if available
            let subtypeText = subtype;
            if (subtypeSelect && subtypeSelect.selectedIndex >= 0) {
                subtypeText = subtypeSelect.options[subtypeSelect.selectedIndex].text;
            }

            const ability = abilityInput?.value?.trim() || '';

            this.updateNoteUI({ level, type, subtype, subtypeText, ability });
        };

        if (levelSelect) levelSelect.addEventListener('change', updateSticky);
        if (typeSelect) typeSelect.addEventListener('change', () => {
            // Wait briefly for subtypes to populate if type changes
            setTimeout(updateSticky, 100);
        });
        if (subtypeSelect) subtypeSelect.addEventListener('change', updateSticky);
        if (abilityInput) abilityInput.addEventListener('input', updateSticky);
    }

    getApiKey(): string | null {
        const input = document.getElementById('api-key') as HTMLInputElement | null;
        if (!input || !input.value.trim()) {
            this.globalUI.showToast(window.i18n?.t('toasts.enterApiKey') || 'Please enter API key', 'warning');
            return null;
        }
        const key = input.value.trim();
        localStorage.setItem('gemini_api_key', key);
        return key;
    }

    getGenerationParams(e?: SubmitEvent): GenerationParams {
        const form = document.getElementById('generator-form') as HTMLFormElement;
        const formData = new FormData(form);

        // Read from form inputs directly (priority), then fallback to Sticky Note
        const itemTypeSelect = document.getElementById('item-type') as HTMLSelectElement | null;
        const itemSubtypeSelect = document.getElementById('item-subtype') as HTMLSelectElement | null;
        const itemLevelSelect = document.getElementById('item-level') as HTMLSelectElement | null;

        // Sticky Note (fallback for when form elements might be empty)
        const noteLevel = document.getElementById('note-level') as HTMLElement | null;
        const noteType = document.getElementById('note-type') as HTMLElement | null;
        const noteSubtype = document.getElementById('note-subtype') as HTMLElement | null;

        // Priority: Form input > Sticky Note > FormData
        const type = itemTypeSelect?.value || noteType?.dataset?.value || formData.get('type') as string || '';
        const subtype = itemSubtypeSelect?.value || noteSubtype?.dataset?.value || formData.get('subtype') as string || '';
        const level = itemLevelSelect?.value || noteLevel?.dataset?.value || formData.get('level') as string || '';
        const ability = (document.getElementById('item-ability') as HTMLInputElement | null)?.value?.trim() || formData.get('ability') as string || '';

        // Determine mode
        const submitterId = e?.submitter ? (e.submitter as HTMLElement).id : 'generate-creative-btn';
        const complexityMode = (submitterId === 'generate-simple-btn') ? 'simple' : 'creative';

        // Context
        const useVisualContext = (document.getElementById('use-visual-context') as HTMLInputElement | null)?.checked || false;

        // Manual Overrides
        const attunement = (document.getElementById('attunement') as HTMLInputElement | null)?.checked || false;
        const weaponDamage = (document.getElementById('weapon-damage') as HTMLInputElement | null)?.value?.trim() || '';
        const armorClass = (document.getElementById('armor-class') as HTMLInputElement | null)?.value?.trim() || '';
        const customVisualPrompt = (document.getElementById('custom-visual-prompt') as HTMLInputElement | null)?.value?.trim() || '';

        return {
            type,
            subtype,
            level,
            ability,
            complexityMode,
            useVisualContext,
            overrides: {
                attunement,
                weaponDamage,
                armorClass,
                customVisualPrompt
            }
        };
    }

    updateNoteUI(options: NoteUIOptions | string, ...args: string[]): void {
        // Support both old signature (level, type, subtype) and new object signature
        let level: string | undefined;
        let type: string | undefined;
        let subtype: string | undefined;
        let subtypeText: string | undefined;
        let ability: string | undefined;
        let style: string | undefined;
        let attunement: boolean | undefined;
        let damage: string | undefined;
        let armorClass: string | number | undefined;

        if (typeof options === 'string') {
            // Old signature: updateNoteUI(level, type, subtype)
            level = options;
            type = args[0];
            subtype = args[1];
        } else {
            // New signature: updateNoteUI({ level, type, subtype, subtypeText, ability, style, attunement, damage, armorClass })
            ({ level, type, subtype, subtypeText, ability, style, attunement, damage, armorClass } = options);
        }

        console.log('📝 updateNoteUI called with:', { level, type, subtype, subtypeText });

        const noteLevel = document.getElementById('note-level') as HTMLElement | null;
        const noteType = document.getElementById('note-type') as HTMLElement | null;
        const noteSubtype = document.getElementById('note-subtype') as HTMLElement | null;
        const i18n = window.i18n;

        if (noteLevel && level) {
            noteLevel.textContent = level;
            noteLevel.dataset.value = level;
        }
        if (noteType && type) {
            // Try to translate type using i18n or fallback map
            let displayType = type.toUpperCase();
            if (i18n) {
                const translated = i18n.t(`typeSection.${type}`);
                // Only use translation if it returns a real string and not the key
                if (translated && !translated.startsWith('typeSection.')) {
                    displayType = translated.toUpperCase(); // Ensure uppercase for style
                }
            }

            // Fallback map for Hebrew if i18n fails or isn't loaded yet
            if (i18n?.getLocale() === 'he') {
                const hebrewTypes: Record<string, string> = {
                    'weapon': 'נשק', 'armor': 'שריון', 'wondrous': 'חפץ פלא',
                    'potion': 'שיקוי', 'ring': 'טבעת', 'scroll': 'מגילה',
                    'staff': 'מטה', 'wand': 'שרביט'
                };
                if (hebrewTypes[type]) displayType = hebrewTypes[type];
            }

            noteType.textContent = displayType;
            noteType.dataset.value = type;
        }
        if (noteSubtype) {
            // Use subtypeText if provided (contains Hebrew), otherwise fallback to subtype value
            // Also clean up parentheses if present (e.g. "Plate Armor (Full Plate)" -> "Plate Armor")
            const rawText = subtypeText || subtype || '-';
            console.log('Raw subtype text:', rawText);

            // If text contains Hebrew characters, prioritize it
            const hasHebrew = /[א-ת]/.test(rawText);

            let displayText = rawText;
            if (hasHebrew) {
                // If it has Hebrew, it might be "Hebrew (English)" format
                // We want to keep the Hebrew part usually, or just show it as is
                displayText = rawText.split('(')[0].trim();
            } else {
                // English only - try to translate or show as is
                displayText = rawText.split('(')[0].trim();
            }

            console.log('Final subtype display:', displayText);
            noteSubtype.textContent = (displayText === '-- בחר חפץ --' || !displayText) ? '-' : displayText;
            noteSubtype.dataset.value = subtype || '';
        }

        // Update extended fields via globalUI
        // NOTE: Do NOT pass type/subtype here as we already set them with localized values above
        this.globalUI.updateStickyNote({
            level,
            // type and subtype are already set directly above with Hebrew translations
            ability,
            style,
            attunement,
            damage,
            armorClass
        });

        // Also update form inputs
        const typeSelect = document.getElementById('item-type') as HTMLSelectElement | null;
        const levelSelect = document.getElementById('item-level') as HTMLSelectElement | null;
        const subtypeSelect = document.getElementById('item-subtype') as HTMLSelectElement | null;

        if (typeSelect && type) typeSelect.value = type;
        if (levelSelect && level) levelSelect.value = level;
        if (subtypeSelect && subtype) subtypeSelect.value = subtype;
    }

    setLoading(isLoading: boolean, message: string = ''): void {
        if (isLoading) {
            this.globalUI.showLoading();
            if (message) this.preview.updateProgress(0, 5, message);
        } else {
            this.globalUI.hideLoading();
            this.preview.resetProgress();
        }
    }

    updateProgress(step: number, percent: number, message: string): void {
        this.preview.updateProgress(step, percent, message);
    }

    updateLayoutSliders(layoutOffset: Record<string, unknown>): void {
        console.log('📐 updateLayoutSliders called with:', layoutOffset);
        for (const [key, value] of Object.entries(layoutOffset)) {
            if (typeof value === 'number') {
                // Map layout offset keys to slider IDs
                let sliderId: string;
                if (key === 'coreStats') {
                    sliderId = 'coreStats-offset';
                } else if (key === 'imageYOffset') {
                    sliderId = 'image-offset';
                } else if (key === 'imageScale') {
                    sliderId = 'image-scale';
                } else if (key === 'imageRotation') {
                    sliderId = 'image-rotation';
                } else if (key === 'imageFade') {
                    sliderId = 'image-fade';
                } else if (key === 'imageShadow') {
                    sliderId = 'image-shadow';
                } else if (key === 'backgroundScale') {
                    sliderId = 'bg-scale';
                } else if (key.endsWith('Width')) {
                    // Width sliders: nameWidth -> name-width, typeWidth -> type-width, etc.
                    // Only some width sliders exist in HTML
                    const prefix = key.replace('Width', '');
                    sliderId = `${prefix}-width`;
                } else {
                    sliderId = `${key}-offset`;
                }

                const slider = document.getElementById(sliderId) as HTMLInputElement | null;
                if (slider) {
                    console.log(`  Setting ${sliderId} to ${value}`);
                    slider.value = String(value);
                    // DON'T dispatch event - it causes listeners to update state back
                    // Just update the display label manually instead
                }

                // Update value displays manually
                if (key === 'imageScale') {
                    const disp = document.getElementById('image-scale-val');
                    if (disp) disp.textContent = value.toFixed(1);
                } else if (key === 'imageRotation') {
                    const disp = document.getElementById('image-rotation-val');
                    if (disp) disp.textContent = `${value}°`;
                } else if (key === 'imageFade') {
                    const disp = document.getElementById('image-fade-val');
                    if (disp) disp.textContent = String(value);
                } else if (key === 'imageShadow') {
                    const disp = document.getElementById('image-shadow-val');
                    if (disp) disp.textContent = String(value);
                } else if (key === 'backgroundScale') {
                    const disp = document.getElementById('bg-scale-val');
                    if (disp) disp.textContent = value.toFixed(1);
                }
            }
        }
    }

    updateFontSizeDisplay(nameSize: number): void {
        const display = document.getElementById('nameSize-display');
        if (display) display.textContent = `${nameSize}px`;
    }

    setButtonState(btnId: string, disabled: boolean, text?: string): void {
        const btn = document.getElementById(btnId) as HTMLButtonElement | null;
        if (btn) {
            btn.disabled = disabled;
            if (text) btn.textContent = text;
        }
    }
}
