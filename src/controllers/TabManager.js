import { CharacterController } from './CharacterController.js';

export class TabManager {
    constructor() {
        this.tabs = document.querySelectorAll('.nav-tab');
        this.contents = document.querySelectorAll('.tab-content');
        this.characterSheetLoaded = false;

        this.init();
    }

    init() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab;
                this.switchTab(targetId);
            });
        });

        // Load Character Sheet immediately to ensure it's ready, or lazy load on first click
        // For now, let's lazy load
    }

    async switchTab(tabId) {
        console.log(`TabManager: Switching to ${tabId}`);

        // Update Buttons
        this.tabs.forEach(t => {
            if (t.dataset.tab === tabId) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // Update Content
        this.contents.forEach(c => {
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

            // Initialize Controller for Character Sheet
            // Reuse global instance if it exists (created by main.js)
            if (window.characterController) {
                this.characterController = window.characterController;
                // Re-initialize to setup listeners now that DOM is loaded
                this.characterController.init();
            } else {
                this.characterController = new CharacterController();
            }

        } catch (error) {
            console.error("Failed to load character sheet:", error);
        }
    }
}
