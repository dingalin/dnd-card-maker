// JS imports - CSS is now loaded via link tags in index.html
import './component-loader.js';
import './navigation-manager.js';
import { initializeApp } from './app-init.js';

// Global error handlers
window.onerror = function (msg, url, line, col, error) {
    console.error("Global Error:", msg, url, line, col, error);
    return false;
};

window.addEventListener('unhandledrejection', function (event) {
    console.error("Unhandled Rejection:", event.reason);
});

// Wait for components to load
if (window.areComponentsLoaded) {
    initializeApp();
} else {
    document.addEventListener('componentsLoaded', initializeApp);
}
