/**
 * Component Loader - טוען HTML components באופן דינמי
 * 
 * משמש לפיצול index.html למקטעים קטנים וניתנים לניהול
 */

// Detect base path for GitHub Pages or local development
const BASE_PATH = (() => {
    const path = window.location.pathname;
    // If running on GitHub Pages (path contains /dnd-card-maker/)
    if (path.includes('/dnd-card-maker/')) {
        return '/dnd-card-maker/';
    }
    // Local development
    return '/';
})();

class ComponentLoader {
    /**
     * טוען component בודד
     * @param {string} placeholderId - ה-ID של ה-placeholder element
     * @param {string} componentPath - נתיב ל-component HTML
     */
    static async loadComponent(placeholderId, componentPath) {
        try {
            const fullPath = BASE_PATH + componentPath + '?v=' + new Date().getTime();
            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${componentPath}: ${response.statusText}`);
            }
            const html = await response.text();
            const placeholder = document.getElementById(placeholderId);
            if (placeholder) {
                placeholder.outerHTML = html;
                console.log(`✅ Loaded: ${componentPath}`);
            } else {
                console.error(`❌ Placeholder ${placeholderId} not found`);
            }
        } catch (error) {
            console.error(`❌ Error loading component ${componentPath}:`, error);
            throw error;
        }
    }

    /**
     * טוען את כל ה-components
     */
    static async loadAll() {
        console.log('🔄 Loading components...');

        const components = [
            { id: 'header-placeholder', path: 'components/header.html' },
            { id: 'gallery-placeholder', path: 'components/history-gallery.html' },
            { id: 'print-modal-placeholder', path: 'components/print-modal.html' },
            { id: 'scroll-content-area', path: 'components/scroll-menu.html' },
            { id: 'sidebar-start-placeholder', path: 'components/sidebar-start.html' },
            { id: 'preview-placeholder', path: 'components/preview-panel.html' },
            { id: 'sidebar-end-placeholder', path: 'components/sidebar-end.html' }
        ];

        try {
            await Promise.all(
                components.map(c => this.loadComponent(c.id, c.path))
            );

            console.log('✅ All components loaded successfully');
            window.areComponentsLoaded = true;
            // Dispatch event שאומר שה-components נטענו
            document.dispatchEvent(new Event('componentsLoaded'));
        } catch (error) {
            console.error('❌ Failed to load some components:', error);
        }
    }
}

// טעינה אוטומטית כשהדף נטען
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ComponentLoader.loadAll());
} else {
    ComponentLoader.loadAll();
}
