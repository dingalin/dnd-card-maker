/**
 * Loading State Utilities
 * Provides consistent loading state management for async operations
 */

import { UI } from '../config/index';

// Extend Window interface to include i18n
declare global {
    interface Window {
        i18n?: {
            t: (key: string) => string;
        };
    }
}

// Types
export interface LoadingOptions {
    loadingText?: string;
    showSpinner?: boolean;
}

interface OriginalState {
    text: string | null;
    disabled: boolean;
}

export interface LoadingStateController {
    start: (text?: string) => void;
    update: (text: string) => void;
    stop: () => void;
}

/**
 * Wrap a button's async action with loading state management
 */
export async function withLoading<T>(
    button: HTMLButtonElement | null,
    asyncFn: () => Promise<T>,
    options: LoadingOptions = {}
): Promise<T> {
    const {
        loadingText = window.i18n?.t('common.loading') || 'Loading...',
        showSpinner = true
    } = options;

    if (!button) {
        return asyncFn();
    }

    const originalText = button.textContent;
    const originalDisabled = button.disabled;

    try {
        button.disabled = true;
        button.textContent = loadingText;
        if (showSpinner) {
            button.classList.add('loading');
        }

        return await asyncFn();
    } finally {
        button.disabled = originalDisabled;
        button.textContent = originalText;
        if (showSpinner) {
            button.classList.remove('loading');
        }
    }
}

/**
 * Create a loading state manager for a specific element
 */
export function createLoadingState(elementId: string): LoadingStateController {
    const element = document.getElementById(elementId) as HTMLButtonElement | null;
    let originalState: OriginalState | null = null;

    return {
        start(text?: string): void {
            if (!element) return;
            originalState = {
                text: element.textContent,
                disabled: element.disabled
            };
            element.disabled = true;
            element.textContent = text || 'Loading...';
            element.classList.add('loading');
        },

        update(text: string): void {
            if (element) {
                element.textContent = text;
            }
        },

        stop(): void {
            if (!element || !originalState) return;
            element.disabled = originalState.disabled;
            element.textContent = originalState.text;
            element.classList.remove('loading');
            originalState = null;
        }
    };
}

/**
 * Show global loading overlay
 */
export function setGlobalLoading(show: boolean, message: string | null = null): void {
    const overlay = document.getElementById('loading-overlay');
    const text = document.getElementById('loading-text');

    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
            if (text && message) {
                text.textContent = message;
            }
        } else {
            overlay.classList.add('hidden');
        }
    }
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number = UI.DEBOUNCE_MS
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>): void => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

export default {
    withLoading,
    createLoadingState,
    setGlobalLoading,
    debounce
};
