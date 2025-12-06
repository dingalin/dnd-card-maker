/**
 * Navigation Manager
 * Handles the "Stone Buttons & Scroll" navigation logic.
 * Supports multiple independent navigation areas using Event Delegation.
 */

class NavigationManager {
    constructor(config = {}) {
        this.containerId = config.containerId || 'scroll-content-area';
        this.scopeSelector = config.scopeSelector || 'body';
        this.bodyClass = config.bodyClass || null; // Class to add to body when active
        this.buttonSelector = config.buttonSelector || '.stone-btn';

        this.scrollContainer = document.getElementById(this.containerId);
        this.initialized = false;

        // Bind for event listener removal (if needed)
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.initialized) return;

        // Always try to fetch fresh reference
        this.scrollContainer = document.getElementById(this.containerId);

        if (!this.scrollContainer) {
            console.warn(`NavigationManager: Container #${this.containerId} not found during init`);
            return;
        }

        console.log(`NavigationManager: Initializing for #${this.containerId} with delegation.`);

        // Single Global Listener for everything
        document.addEventListener('click', this.handleGlobalClick);
        this.initialized = true;
    }

    handleGlobalClick(e) {
        // Ensure container reference is fresh (handle DOM replacements)
        if (!this.scrollContainer || !document.contains(this.scrollContainer)) {
            this.scrollContainer = document.getElementById(this.containerId);
        }

        // If still missing, we can't do anything (or assume closed)
        if (!this.scrollContainer) {
            // console.warn(`[Nav-${this.containerId}] Container missing, ignoring click.`);
            return;
        }

        // 1. Check if a button in OUR scope was clicked
        // Re-query scope too
        const scope = document.querySelector(this.scopeSelector);
        if (!scope) return; // Scope missing, ignore

        // Use closest to find the button, even if clicked on icon/text inside
        const btn = e.target.closest(this.buttonSelector);

        // If the button is inside our scope:
        const isMyButton = btn && scope.contains(btn);

        if (isMyButton) {
            // Ignore buttons without a target (e.g., Gallery button which is handled separately)
            if (!btn.dataset.target) {
                return;
            }

            console.log(`[Nav-${this.containerId}] Clicked button:`, btn.dataset.target);
            e.preventDefault();
            // We do NOT stop propagation, allowing other managers to close their menus if needed
            this.toggleSection(btn);
            return;
        }

        // 2. Check if we should close (Click outside)
        if (this.scrollContainer.classList.contains('active')) {
            // Robust check: Is the clicked element inside THIS container?
            // using closest is safer for nested elements
            const isInside = this.scrollContainer.contains(e.target) || !!e.target.closest(`#${this.containerId}`);

            const isTargetInDoc = document.contains(e.target);

            // console.log(`[Nav-${this.containerId}] Click outside check. Inside: ${isInside}`);

            // If click is NOT inside our scroll container (and wasn't one of our buttons), CLOSE.
            // EXTRA CHECK: If target is NOT in document, it might be a removed element (e.g. from a rerender)
            // If it's removed, we shouldn't assume it was outside.
            if (!isInside && isTargetInDoc) {
                // console.log(`[Nav-${this.containerId}] Closing (Click Outside)`);
                this.closeAll();
            }
        }
    }

    toggleSection(btn) {
        const targetId = btn.dataset.target;
        const targetSection = this.scrollContainer.querySelector(`#${targetId}`);

        if (!targetSection) {
            console.error(`NavigationManager: Target section #${targetId} not found`);
            return;
        }

        const wasActive = btn.classList.contains('active');

        // Close all first (reset state)
        this.closeAll();

        if (!wasActive) {
            // Open this one
            btn.classList.add('active');
            this.scrollContainer.classList.add('active');
            targetSection.classList.remove('hidden');
            if (this.bodyClass) document.body.classList.add(this.bodyClass);
        }
    }

    closeAll() {
        // Locate current buttons dynamically to remove active class
        const scope = document.querySelector(this.scopeSelector);
        if (scope) {
            const buttons = scope.querySelectorAll(this.buttonSelector);
            buttons.forEach(b => b.classList.remove('active'));
        }

        if (this.scrollContainer) {
            this.scrollContainer.classList.remove('active');
            const sections = this.scrollContainer.querySelectorAll('.scroll-section');
            sections.forEach(s => s.classList.add('hidden'));
        }

        if (this.bodyClass) document.body.classList.remove(this.bodyClass);
    }
}

// Auto-init for both areas
if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager; // Expose class

    let isNavInitialized = false;

    const initNav = async () => {
        // Wait for next tick/frame to ensure DOM updates are painted/ready
        await new Promise(r => setTimeout(r, 50));

        console.log("NavigationManager: initNav called");
        if (isNavInitialized) return;
        isNavInitialized = true;

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
            bodyClass: 'left-menu-open'
        });
        window.sidebarEndNav.init();
    };

    // Initialize only when components are loaded
    if (window.areComponentsLoaded) {
        initNav();
    } else {
        document.addEventListener('componentsLoaded', initNav);
    }
}
