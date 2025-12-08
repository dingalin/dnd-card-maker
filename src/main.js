// Core Imports
import './component-loader.js';
import './navigation-manager.js';
import './dnd-data.js';

import CardRenderer from './card-renderer.js';
import { BackgroundManager } from './background-manager.js';
import { stateManager } from './state.js';
import { previewManager } from './preview-manager.js';
import './printing/PrintManager.js';

// New Architecture Imports
import { UIManager } from './ui/UIManager.js';
import { EditorController } from './controllers/EditorController.js';
import { GeneratorController } from './controllers/GeneratorController.js';
import { RenderController } from './controllers/RenderController.js';
import { HistoryController } from './controllers/HistoryController.js';

// Legacy Init (for floating windows, bubbles)
import { initUI, showToast, initWindowManager } from './ui-helpers.js';

// Global error handlers
window.onerror = function (msg, url, line, col, error) {
    console.error("Global Error:", msg, url, line, col, error);
    return false;
};

async function initApp() {
    console.log("🚀 Initializing D&D Card Creator (Professional Architecture v2)...");

    // 1. Initialize Renderer
    let renderer;
    try {
        // Wait for next tick to ensure DOM is updated after componentsLoaded
        await new Promise(resolve => setTimeout(resolve, 50));

        const canvas = document.getElementById('card-canvas');
        if (!canvas) throw new Error("Card canvas element not found");

        renderer = new CardRenderer('card-canvas');
        window.cardRenderer = renderer; // Global for debug/legacy access
    } catch (e) {
        console.error("Renderer Init Error:", e);
        showToast("שגיאה בטעינת הקנבס", 'error');
        return;
    }

    // 2. Initialize Managers
    const uiManager = new UIManager();
    window.uiManager = uiManager;

    // Init Preview Manager (after DOM ready)
    previewManager.init();

    // 3. Initialize Controllers
    // Editor: Handles inputs and sliders -> State
    const editorController = new EditorController(stateManager);

    // Generator: Handles API calls -> State
    const generatorController = new GeneratorController(stateManager, uiManager, previewManager);

    // Render: Handles State -> Canvas
    const renderController = new RenderController(stateManager, renderer);

    // History: Handles Gallery
    const historyController = new HistoryController(stateManager, uiManager);

    // 4. Initialize Background Manager
    window.backgroundManager = new BackgroundManager(renderer);

    // 5. Legacy & Helper Initialization
    initUI(); // Slider bubbles, toasts
    initWindowManager(); // Floating windows

    // 6. Restore Session
    const loadedSavedCard = stateManager.loadCurrentCard();
    if (!loadedSavedCard) {
        // Initial Default State
        stateManager.setCardData({
            name: "שם החפץ",
            typeHe: "סוג חפץ",
            rarityHe: "נדירות",
            description: "החפץ שלך יופיע כאן...",
            gold: "-"
        });
        // Initial Render for empty state
        renderer.render(stateManager.getState().cardData, stateManager.getState().settings.offsets);

        // --- Fix: Force re-render after delay (Handle GitHub Pages font loading) ---
        setTimeout(() => {
            console.log("Force re-draw for GitHub Pages");
            renderer.render(stateManager.getState().cardData, stateManager.getState().settings.offsets);
        }, 500);

        // Expose as requested for debugging
        window.CardRenderer = renderer;

        // --- Fix: Handle Resize / Canvas Wipe ---
        // Ensure that if the window is resized (causing layout changes that might wipe the canvas),
        // we re-render immediately.
        window.addEventListener('resize', () => {
            // Debounce slightly or just run? User asked for "immediate".
            // We'll use a tiny timeout to let the layout settle, then render.
            if (window._resizeTimeout) clearTimeout(window._resizeTimeout);
            window._resizeTimeout = setTimeout(() => {
                console.log("Resize detected, forcing re-render...");
                renderer.render(stateManager.getState().cardData, stateManager.getState().settings.offsets);
            }, 100);
        });
    } else {
        showToast("📂 קלף אחרון נטען!", 'info');
        // If we loaded a card, we should show the editor UI
        if (uiManager.elements.regenerateControls) uiManager.elements.regenerateControls.classList.remove('hidden');
        if (uiManager.elements.contentEditor) uiManager.elements.contentEditor.classList.remove('hidden');
    }

    // Restore API Keys
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey && document.getElementById('api-key')) {
        document.getElementById('api-key').value = savedKey;
    }

    const savedGetImgKey = localStorage.getItem('getimg_api_key');
    if (savedGetImgKey && document.getElementById('getimg-api-key')) {
        document.getElementById('getimg-api-key').value = savedGetImgKey;
    }

    console.log("✨ Core Systems Online | Architecture Refactored");
}

// Wait for components to load before initializing
if (window.areComponentsLoaded) {
    initApp();
} else {
    document.addEventListener('componentsLoaded', initApp);
}
