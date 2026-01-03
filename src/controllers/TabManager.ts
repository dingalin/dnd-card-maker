// @ts-nocheck
import { CharacterController } from './CharacterController.ts';

interface WindowGlobals {
    i18n?: any;
    characterController?: any;
    stateManager?: any;
    uiManager?: any;
}

export class TabManager {
    private tabs: NodeListOf<HTMLElement>;
    private contents: NodeListOf<HTMLElement>;
    private characterSheetLoaded: boolean;
    private characterController: any;

    constructor() {
        this.tabs = document.querySelectorAll('.nav-tab');
        this.contents = document.querySelectorAll('.tab-content');
        this.characterSheetLoaded = false;

        this.init();
    }

    init() {
        this.tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab;
                if (targetId) {
                    this.switchTab(targetId);
                }
            });
        });

        // Load Character Sheet immediately to ensure it's ready, or lazy load on first click
        // For now, let's lazy load
    }

    async switchTab(tabId: string) {
        console.log(`TabManager: Switching to ${tabId}`);

        // Update Buttons
        this.tabs.forEach(t => {
            if (t.dataset.tab === tabId) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // Dynamically query tab content elements (components may load after TabManager init)
        const contents = document.querySelectorAll('.tab-content');

        // Update Content
        contents.forEach(c => {
            if (c.id === `tab-${tabId}`) {
                c.classList.remove('hidden');
                c.classList.add('active');
            } else {
                c.classList.add('hidden');
                c.classList.remove('active');
            }
        });

        // Lazy Load Logic
        if (tabId === 'character-sheet' && !this.characterSheetLoaded) {
            await this.loadCharacterSheet();
        }
    }

    async loadCharacterSheet() {
        console.log("TabManager: Loading Character Sheet components...");
        try {
            // Load Sheet (Central Grid)
            const sheetContainer = document.getElementById('character-sheet-placeholder');
            if (sheetContainer) {
                const response = await fetch('./components/character-sheet.html');
                sheetContainer.innerHTML = await response.text();
            }

            // Load Sidebar (Right Panel)
            const sidebarContainer = document.getElementById('character-sidebar-placeholder');
            if (sidebarContainer) {
                const response = await fetch('./components/character-sidebar.html');
                sidebarContainer.innerHTML = await response.text();
            }

            this.characterSheetLoaded = true;
            console.log("TabManager: Character Sheet & Sidebar Loaded.");

            const globals = window as unknown as WindowGlobals;

            // CRITICAL: Update i18n translations for dynamically loaded elements
            if (globals.i18n && globals.i18n.updateDOM) {
                globals.i18n.updateDOM();
                console.log("TabManager: i18n DOM updated for character sheet components.");
            }

            // Initialize Controller for Character Sheet
            // Reuse global instance if it exists (created by main.js)
            if (globals.characterController) {
                this.characterController = globals.characterController;
                // Re-initialize to setup listeners now that DOM is loaded
                if (this.characterController.init) {
                    this.characterController.init();
                }
            } else {
                // Fallback: create new one with global stateManager
                // Note: ensure CharacterController is importable or globally available if needed
                if (globals.stateManager) {
                    this.characterController = new CharacterController(globals.stateManager);
                }
            }

        } catch (error) {
            console.error("Failed to load character sheet:", error);
        }
    }
}

