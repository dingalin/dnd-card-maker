/**
 * Internationalization (i18n) Service
 * Manages language switching and translation loading for the D&D Card Creator
 */

class I18nService {
    constructor() {
        this.currentLocale = 'en'; // Default to English
        this.translations = {};
        this.fallbackTranslations = {};
        this.isLoaded = false;
        this.listeners = [];
    }

    /**
     * Initialize the i18n service with saved preference
     */
    async init() {
        console.log('[i18n] Starting initialization...');

        // Load saved preference or default to Hebrew
        this.currentLocale = localStorage.getItem('dnd-card-locale') || 'en';
        console.log('[i18n] Saved locale:', this.currentLocale);

        // Load fallback (Hebrew) first
        try {
            console.log('[i18n] Fetching Hebrew translations from /locales/he.json...');
            const heResponse = await fetch('./locales/he.json');
            console.log('[i18n] Hebrew fetch response status:', heResponse.status);
            if (!heResponse.ok) {
                throw new Error(`HTTP ${heResponse.status}: ${heResponse.statusText}`);
            }
            this.fallbackTranslations = await heResponse.json();
            console.log('[i18n] Hebrew translations loaded, keys:', Object.keys(this.fallbackTranslations).length);
        } catch (e) {
            console.error('[i18n] Could not load Hebrew fallback:', e);
        }

        // Load current locale
        await this.loadLocale(this.currentLocale, false);
        this.isLoaded = true;

        // Update document direction and language
        this.updateDocumentAttributes();

        // Initial DOM update
        this.updateDOM();

        console.log(`[i18n] Initialized with locale: ${this.currentLocale}`);
    }

    /**
     * Load a specific locale
     * @param {string} locale - 'he' or 'en'
     * @param {boolean} updateDOM - Whether to update the DOM after loading
     */
    async loadLocale(locale, updateDOM = true) {
        try {
            const response = await fetch(`./locales/${locale}.json`);
            if (!response.ok) throw new Error(`Failed to load locale: ${locale}`);

            this.translations = await response.json();
            this.currentLocale = locale;
            localStorage.setItem('dnd-card-locale', locale);

            this.updateDocumentAttributes();

            if (updateDOM) {
                this.updateDOM();
                this.notifyListeners();
            }

            console.log(`[i18n] Loaded locale: ${locale}`);
        } catch (e) {
            console.error(`[i18n] Error loading locale ${locale}:`, e);
            // Fallback to Hebrew
            if (locale !== 'he') {
                this.translations = this.fallbackTranslations;
                this.currentLocale = 'he';
            }
        }
    }

    /**
     * Toggle between Hebrew and English
     */
    async toggleLocale() {
        const newLocale = this.currentLocale === 'he' ? 'en' : 'he';
        await this.loadLocale(newLocale);
    }

    /**
     * Get translation by dot-notation key
     * @param {string} key - Translation key (e.g., 'nav.gallery')
     * @param {object} params - Optional parameters for interpolation
     * @returns {string} Translated text or key if not found
     */
    t(key, params = {}) {
        let value = this.getNestedValue(this.translations, key);

        // Fallback to Hebrew if not found
        if (value === undefined || value === null) {
            value = this.getNestedValue(this.fallbackTranslations, key);
        }

        // Return key if still not found
        if (value === undefined || value === null) {
            console.warn(`[i18n] Missing translation: ${key}`);
            return key;
        }

        // Simple parameter interpolation: {{param}}
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
            });
        }

        return value;
    }

    /**
     * Get nested value from object using dot notation
     * @param {object} obj - Source object
     * @param {string} path - Dot-notation path
     */
    getNestedValue(obj, path) {
        if (!obj || !path) return undefined;
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Update document-level attributes (lang, dir)
     */
    updateDocumentAttributes() {
        const html = document.documentElement;
        html.lang = this.currentLocale;
        html.dir = this.currentLocale === 'he' ? 'rtl' : 'ltr';
        document.body.classList.toggle('ltr', this.currentLocale === 'en');
        document.body.classList.toggle('rtl', this.currentLocale === 'he');
    }

    /**
     * Update all DOM elements with data-i18n attributes
     */
    updateDOM() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            // Handle different element types
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('placeholder')) {
                    el.placeholder = translation;
                } else {
                    el.value = translation;
                }
            } else if (el.tagName === 'OPTION') {
                el.textContent = translation;
            } else {
                el.textContent = translation;
            }
        });

        // Update elements with data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        // Update elements with data-i18n-title (tooltips)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });

        // Update document title
        const titleEl = document.querySelector('title[data-i18n]');
        if (titleEl) {
            document.title = this.t(titleEl.getAttribute('data-i18n'));
        }
    }

    /**
     * Register a listener for locale changes
     * @param {function} callback - Function to call on locale change
     */
    onLocaleChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of locale change
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.currentLocale);
            } catch (e) {
                console.error('[i18n] Listener error:', e);
            }
        });
    }

    /**
     * Get current locale
     * @returns {string} Current locale code
     */
    getLocale() {
        return this.currentLocale;
    }

    /**
     * Check if current locale is RTL
     * @returns {boolean} True if RTL
     */
    isRTL() {
        return this.currentLocale === 'he';
    }

    /**
     * Get direction string
     * @returns {string} 'rtl' or 'ltr'
     */
    getDirection() {
        return this.isRTL() ? 'rtl' : 'ltr';
    }
}

// Create singleton instance
const i18n = new I18nService();

// Export for module usage
export default i18n;
export { i18n, I18nService };
