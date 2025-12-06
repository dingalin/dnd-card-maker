import CardRenderer from './card-renderer.js';
import UIManager from './ui-manager.js';
import { stateManager } from './state.js';
import { setupEventListeners } from './event-handlers.js';
import { initUI, showToast, initWindowManager } from './ui-helpers.js';
import { BackgroundManager } from './background-manager.js';
import { previewManager } from './preview-manager.js';
import './dnd-data.js'; // Ensure data is loaded

export function initializeApp() {
    console.log("🚀 Initializing app (Refactored)...");

    // Initialize Renderer
    let renderer;
    try {
        renderer = new CardRenderer('card-canvas');
        window.cardRenderer = renderer; // Keep global for backward compatibility if needed
    } catch (e) {
        console.error("Renderer Init Error:", e);
        showToast("שגיאה בטעינת הקנבס: " + e.message, 'error');
        return;
    }

    // Initialize UI Manager
    const uiManager = new UIManager(renderer);
    window.uiManager = uiManager; // Debugging

    // Try to load saved card from localStorage
    const loadedSavedCard = stateManager.loadCurrentCard();

    if (!loadedSavedCard) {
        // Set Initial State only if no saved card
        stateManager.setCardData({
            name: "שם החפץ",
            typeHe: "סוג חפץ",
            rarityHe: "נדירות",
            description: "החפץ שלך יופיע כאן...",
            gold: "-"
        });
    } else {
        showToast("📂 קלף אחרון נטען!", 'info');
        // Show regenerate controls and content editor since we have a loaded card
        const regenerateControls = document.getElementById('regenerate-controls');
        const contentEditor = document.getElementById('content-editor');
        if (regenerateControls) regenerateControls.classList.remove('hidden');
        if (contentEditor) contentEditor.classList.remove('hidden');
    }

    // Initialize UI Helpers
    initUI();
    setTimeout(initWindowManager, 100);

    // Initialize Background Manager
    window.backgroundManager = new BackgroundManager(renderer);

    // Setup Event Listeners
    setupEventListeners();

    showToast("המערכת מוכנה!", 'success');
}
