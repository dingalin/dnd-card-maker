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

// Expose BASE_PATH globally for other modules
window.APP_BASE_PATH = BASE_PATH;

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
     * Fix asset paths for GitHub Pages compatibility
     * This fixes all relative paths to assets/icons, assets/textures, etc.
     */
    static fixAssetPaths() {
        if (BASE_PATH === '/') return; // No fix needed for local dev

        console.log('🔧 Fixing asset paths for GitHub Pages...');

        // Fix all img src attributes that start with "assets/"
        document.querySelectorAll('img[src^="assets/"]').forEach(img => {
            const originalSrc = img.getAttribute('src');
            img.src = BASE_PATH + originalSrc;
        });

        // Fix background images in inline styles
        document.querySelectorAll('[style*="url(\'assets/"]').forEach(el => {
            el.style.backgroundImage = el.style.backgroundImage.replace(
                /url\(['"]?assets\//g,
                `url('${BASE_PATH}assets/`
            );
        });

        // Fix background images in inline styles (double quotes)
        document.querySelectorAll('[style*="url(\\"assets/"]').forEach(el => {
            el.style.backgroundImage = el.style.backgroundImage.replace(
                /url\(['"]?assets\//g,
                `url('${BASE_PATH}assets/`
            );
        });

        console.log('✅ Asset paths fixed for GitHub Pages');
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
            { id: 'sidebar-end-placeholder', path: 'components/sidebar-end.html' },
            { id: 'character-sidebar-placeholder', path: 'components/character-sidebar.html' },
            { id: 'character-sheet-placeholder', path: 'components/character-sheet.html' },
            { id: 'equip-modal-placeholder', path: 'components/equip-modal.html' },
            { id: 'treasure-generator-placeholder', path: 'components/treasure-generator.html' }
        ];

        try {
            await Promise.all(
                components.map(c => this.loadComponent(c.id, c.path))
            );

            // Fix asset paths AFTER components are loaded
            this.fixAssetPaths();

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

