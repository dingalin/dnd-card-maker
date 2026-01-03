// @ts-nocheck
// Core Imports
import './component-loader.ts';
import './navigation-manager.ts';
import './dnd-data.ts';

import CardRenderer from './card-renderer.ts';
import { BackgroundManager } from './background-manager.ts';
import { stateManager } from './state.ts';
import { previewManager } from './preview-manager.ts';
import './printing/PrintManager.js';

// New Architecture Imports
import { UIManager } from './ui/UIManager.js';
import { EditorController } from './controllers/EditorController.ts';
import { GeneratorController } from './controllers/GeneratorController.ts';
import { RenderController } from './controllers/RenderController.ts';
import { HistoryController } from './controllers/HistoryController.ts';
import { TabManager } from './controllers/TabManager.ts';
import { CharacterController } from './controllers/CharacterController.ts';
import TreasureController from './controllers/TreasureController.ts';
import { CardViewerService } from './services/CardViewerService.ts';
import powerBudgetController from './controllers/PowerBudgetController.ts';
import { initAbilitySelector } from './controllers/AbilitySelectorController.ts';
import { initModeController } from './controllers/ModeController.ts';
import { initDraggablePositioner } from './utils/DraggablePositioner.ts';

// i18n (Internationalization)
import i18n from './i18n.ts';

// Centralized Config
import { SliderInitializer } from './config/SliderInitializer';
import { initLayoutSystem } from './utils/LayoutApplier.ts';

// Debug Panel (shows errors in development)
import './utils/DebugPanel.ts';

// Zoom Lock (maintains consistent UI size regardless of browser zoom)
import './utils/ZoomLock.ts';

// Legacy Init (for floating windows, bubbles)
import { initUI, showToast, initWindowManager, initFormHeaderUpdates, initMobileSidebar } from './ui-helpers.ts';

// Global error handlers
window.onerror = function (msg, url, line, col, error) {
    console.error("Global Error:", msg, url, line, col, error);
    return false;
};

// Expose i18n globally for easy access
window.i18n = i18n;

/**
 * Setup Language Toggle Button
 * This is called after i18n is initialized and components are loaded
 */
function setupLanguageToggle() {
    const langToggleBtn = document.getElementById('lang-toggle-btn');
    const langToggleText = document.getElementById('lang-toggle-text');

    if (!langToggleBtn) {
        console.warn('[i18n] Language toggle button not found');
        return;
    }

    // Update button text based on current language
    const updateButtonText = () => {
        const locale = i18n.getLocale();
        langToggleText.textContent = locale === 'he' ? 'EN' : 'עב';
    };

    // Initial update
    updateButtonText();

    // Register for future changes
    i18n.onLocaleChange(() => updateButtonText());

    // Click handler
    langToggleBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('[i18n] Toggle button clicked');
        console.log('[i18n] Current locale:', i18n.getLocale());

        await i18n.toggleLocale();

        console.log('[i18n] New locale:', i18n.getLocale());
        updateButtonText();
    });

    console.log('[i18n] ✅ Language toggle handler initialized');
}

/**
 * Initialize Power Budget Panel
 * Loads the HTML component and injects it into the sidebar
 */
async function initPowerBudgetPanel() {
    try {
        const placeholder = document.getElementById('power-budget-placeholder');
        if (!placeholder) {
            console.warn('[PowerBudget] Placeholder not found, skipping panel injection');
            return;
        }

        // Detect base path for GitHub Pages or local development
        const basePath = window.APP_BASE_PATH || '/';
        const response = await fetch(`${basePath}components/power-budget-panel.html?v=${Date.now()}`);

        if (!response.ok) {
            throw new Error(`Failed to load power-budget-panel.html: ${response.statusText}`);
        }

        const html = await response.text();
        placeholder.innerHTML = html;

        console.log('[PowerBudget] ✅ Panel HTML loaded and injected');
    } catch (error) {
        console.error('[PowerBudget] ❌ Failed to load panel:', error);
    }
}

async function initApp() {
    console.log("🚀 Initializing D&D Card Creator (Professional Architecture v2)...");

    // 0. Initialize i18n (Internationalization)
    await i18n.init();
    console.log(`🌐 Language: ${i18n.getLocale()} | Direction: ${i18n.getDirection()}`);

    // 0.1 Setup Language Toggle Button
    setupLanguageToggle();


    // 0. Initialize Tab System
    const tabManager = new TabManager();

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
        showToast(i18n.t('toasts.loadingError'), 'error');
        return;
    }

    // 1.1 Initialize Back Renderer (for Split View)
    let backRenderer = null;
    try {
        const backCanvas = document.getElementById('card-canvas-back');
        if (backCanvas) {
            backRenderer = new CardRenderer('card-canvas-back');
            window.backRenderer = backRenderer; // Global for debug
            console.log("✅ Back Renderer Initialized");
        }
    } catch (e) {
        console.warn("Back Renderer Init Warning:", e);
    }

    // 2. Initialize Managers
    const uiManager = new UIManager();
    window.uiManager = uiManager;
    window.stateManager = stateManager;

    // Init Preview Manager (after DOM ready)
    previewManager.init();

    // 3. Initialize Controllers
    // Editor: Handles inputs and sliders -> State
    const editorController = new EditorController(stateManager);

    // 3.1 Apply centralized slider config (min/max/default from SliderLimits.ts)
    SliderInitializer.init();

    // Generator: Handles API calls -> State
    const generatorController = new GeneratorController(stateManager, uiManager, previewManager);

    // Render: Handles State -> Canvas
    const renderController = new RenderController(stateManager, renderer, backRenderer);
    window.renderController = renderController; // Expose for global access

    // History: Handles Gallery
    const historyController = new HistoryController(stateManager, uiManager);

    // Character: Handles Character Sheet
    // Created early so it can receive equip events even before tab is visited
    const characterController = new CharacterController(stateManager);
    window.characterController = characterController; // Expose globally for TabManager

    // Treasure: Handles Treasure Generator
    const treasureController = new TreasureController(stateManager, uiManager, generatorController);
    window.treasureController = treasureController; // Expose globally

    // Power Budget: DISABLED - Replaced by AbilitySelector scroll in #ability-content
    // The old power-budget-panel was conflicting with the new scroll-based ability selector
    // await initPowerBudgetPanel();
    // powerBudgetController.init();
    // window.powerBudgetController = powerBudgetController;

    // Ability Selector: Initialize the scroll-based ability picker
    const abilitySelectorController = initAbilitySelector();

    // Mode Controller: Initialize Auto/Manual mode toggle
    const modeController = initModeController();
    window.modeController = modeController;

    // Draggable Positioner: Disabled per user request
    // const draggablePositioner = initDraggablePositioner();
    window.abilitySelectorController = abilitySelectorController;

    // Centralized Layout: Apply positions from LayoutConfig.ts
    initLayoutSystem();

    // 4. Initialize Background Manager
    window.backgroundManager = new BackgroundManager(renderer);

    // 5. Legacy & Helper Initialization
    initUI(); // Slider bubbles, toasts
    initWindowManager(); // Floating windows
    initFormHeaderUpdates(); // Sync dropdown changes with stone menu buttons
    initMobileSidebar(); // Mobile sidebar drawer toggle

    // 6. Restore Session
    const loadedSavedCard = stateManager.loadCurrentCard();
    if (!loadedSavedCard) {
        // Initial Default State (use i18n for translated defaults)
        stateManager.setCardData({
            name: i18n.t('defaults.itemName'),
            typeHe: i18n.t('defaults.itemType'),
            rarityHe: i18n.t('defaults.rarity'),
            quickStats: i18n.t('defaults.quickStats'),
            abilityName: i18n.t('defaults.abilityName'),
            abilityDesc: i18n.t('defaults.abilityDesc'),
            description: i18n.t('defaults.description'),
            gold: "-"
        });

        // NOTE: setCardData triggers 'cardData' event, which RenderController handles.
        // No need for manual render call here.

        // Expose as requested for debugging
        window.CardRenderer = renderer;

        // --- Fix: Handle Resize / Canvas Wipe ---
        // Ensure that if the window is resized (causing layout changes that might wipe the canvas),
        // we re-render immediately using the controller.
        window.addEventListener('resize', () => {
            if (window._resizeTimeout) clearTimeout(window._resizeTimeout);
            window._resizeTimeout = setTimeout(() => {
                console.log("Resize detected, forcing re-render...");
                if (window.renderController) {
                    window.renderController.render(stateManager.getState());
                }
            }, 100);
        });
    } else {
        // We loaded a saved card.
        // CHECK FOR MISSING DEFAULTS (Patching legacy/broken states)
        const currentData = stateManager.getState().cardData;
        let patched = false;

        if (!currentData.back || (!currentData.back.title && !currentData.back.mechanics)) {
            console.log("🔧 Patching missing Ability defaults in loaded card...");

            // Ensure back object exists if missing (V1 corrupted state)
            if (!currentData.back) {
                currentData.back = { title: '', mechanics: '', lore: '' };
            }

            stateManager.updateCardField('back.title', i18n.t('defaults.abilityName'));
            stateManager.updateCardField('back.mechanics', i18n.t('defaults.abilityDesc'));
            patched = true;
        }

        if (patched) {
            stateManager.saveCurrentCard();
            // Updates trigger RenderController automatically
        }

        showToast(i18n.t('toasts.lastCardLoaded'), 'info');
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
