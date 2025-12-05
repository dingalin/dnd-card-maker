/**
 * Navigation Manager
 * Handles the "Stone Buttons & Scroll" navigation logic.
 * Supports multiple independent navigation areas.
 */

class NavigationManager {
    constructor(config = {}) {
        this.containerId = config.containerId || 'scroll-content-area';
        this.scopeSelector = config.scopeSelector || 'body';
        this.bodyClass = config.bodyClass || null; // Class to add to body when active
        this.buttonSelector = config.buttonSelector || '.stone-btn';

        this.scrollContainer = document.getElementById(this.containerId);
        // Find buttons only within the scope
        const scopeElement = document.querySelector(this.scopeSelector);
        this.buttons = scopeElement ? scopeElement.querySelectorAll(this.buttonSelector) : [];

        if (this.scrollContainer) {
            this.sections = this.scrollContainer.querySelectorAll('.scroll-section');
        } else {
            this.sections = [];
            console.warn(`NavigationManager: Container #${this.containerId} not found`);
        }

        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        if (!this.scrollContainer) {
            console.warn(`NavigationManager: Container #${this.containerId} not found`);
            return;
        }

        console.log(`NavigationManager: Initializing for #${this.containerId}. Scope: ${this.scopeSelector}`);

        if (this.buttons.length === 0) {
            console.error(`NavigationManager: NO BUTTONS FOUND for #${this.containerId} using selector '${this.buttonSelector}' inside '${this.scopeSelector}'`);
            // Try to log what IS inside the scope
            const scope = document.querySelector(this.scopeSelector);
            if (scope) {
                console.log(`NavigationManager: Scope found. InnerHTML length: ${scope.innerHTML.length}`);
            } else {
                console.error(`NavigationManager: Scope element '${this.scopeSelector}' NOT FOUND in DOM.`);
            }
            return;
        }

        console.log(`NavigationManager: Found ${this.buttons.length} buttons for #${this.containerId}. Attaching listeners...`);

        this.buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log(`NavigationManager: CLICK DETECTED on button for target '${btn.dataset.target}'`);
                // Prevent form submission if inside form
                e.preventDefault();
                e.stopPropagation(); // Try to stop propagation to see if it helps

                // Check if this button controls a section in this manager's container
                const targetId = btn.dataset.target;
                const targetSection = this.scrollContainer.querySelector(`#${targetId}`);

                if (targetSection) {
                    console.log(`NavigationManager: Target section found. Toggling...`);
                    this.toggleSection(btn, targetSection);
                } else {
                    console.error(`NavigationManager: Target section #${targetId} NOT FOUND in container #${this.containerId}`);
                    // Debug: list all sections available
                    const available = Array.from(this.scrollContainer.querySelectorAll('.scroll-section')).map(s => s.id);
                    console.log(`NavigationManager: Available sections: ${available.join(', ')}`);
                }
            });
        });

        // Close scroll when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.scrollContainer.contains(e.target) &&
                !this.isClickOnMyButtons(e.target)) {
                // console.log(`NavigationManager: Click outside detected for #${this.containerId}, closing.`);
                this.closeAll();
            }
        });

        this.initialized = true;
    }

    isClickOnMyButtons(target) {
        let isMyButton = false;
        this.buttons.forEach(btn => {
            if (btn.contains(target)) isMyButton = true;
        });
        return isMyButton;
    }

    toggleSection(btn, targetSection) {
        const isActive = btn.classList.contains('active');
        console.log(`NavigationManager: toggleSection. Current active state: ${isActive}`);

        // Close all first
        this.closeAll();

        if (!isActive) {
            // Open this one
            console.log(`NavigationManager: Opening section...`);
            btn.classList.add('active');
            this.scrollContainer.classList.add('active');
            targetSection.classList.remove('hidden');
            if (this.bodyClass) document.body.classList.add(this.bodyClass);

            // Force layout recalculation
            void this.scrollContainer.offsetWidth;
        }
    }

    closeAll() {
        this.buttons.forEach(b => b.classList.remove('active'));
        if (this.scrollContainer) {
            this.scrollContainer.classList.remove('active');
        }
        this.sections.forEach(s => s.classList.add('hidden'));
        if (this.bodyClass) document.body.classList.remove(this.bodyClass);
    }
}

// Global Click Debugger
document.addEventListener('click', (e) => {
    console.log('Global Click:', e.target);
    if (e.target.closest('.stone-btn')) {
        console.log('Global Click: Hit a .stone-btn!');
    }
});

// Auto-init for both areas
if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager; // Expose class

    let isNavInitialized = false;

    const initNav = () => {
        console.log("NavigationManager: initNav called");
        if (isNavInitialized) {
            console.log("NavigationManager: Already initialized, skipping.");
            return;
        }
        isNavInitialized = true;

        console.log("NavigationManager: Creating instances...");
        setTimeout(() => {
            // 1. Main Header Navigation
            window.mainNav = new NavigationManager({
                containerId: 'main-scroll-area',
                scopeSelector: '.main-nav'
            });
            window.mainNav.init();

            // 2. Sidebar Navigation
            window.sidebarNav = new NavigationManager({
                containerId: 'sidebar-scroll-area',
                scopeSelector: '.sidebar-start .stone-menu'
            });
            window.sidebarNav.init();

            // 3. Left Sidebar Navigation (Edit & Design)
            window.sidebarEndNav = new NavigationManager({
                containerId: 'sidebar-end-scroll-area',
                scopeSelector: '.sidebar-end .stone-menu',
                bodyClass: 'left-menu-open' // Add class when this menu is open
            });
            window.sidebarEndNav.init();
        }, 500); // Increased delay to ensure DOM is ready
    };

    // Initialize only when components are loaded
    if (window.areComponentsLoaded) {
        console.log("NavigationManager: Components already loaded, initializing.");
        initNav();
    } else {
        console.log("NavigationManager: Waiting for componentsLoaded event.");
        document.addEventListener('componentsLoaded', initNav);
    }
}
