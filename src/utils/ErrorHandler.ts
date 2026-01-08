// @ts-nocheck
/**
 * ErrorHandler - Centralized error handling
 * Provides consistent error management across the application
 */

/**
 * Error severity levels
 */
export enum ErrorLevel {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export interface ErrorHandlerOptions {
    level?: ErrorLevel;
    showToast?: boolean;
    rethrow?: boolean;
    useLocale?: boolean;  // Use i18n locale key instead of raw message
}

declare global {
    interface Window {
        uiManager?: any;
        i18n?: any;
    }
}

/**
 * Classify error to get appropriate locale key
 */
export function classifyError(error: Error | string | unknown): string {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch') || message.includes('net::')) {
        return 'toasts.networkError';
    }

    // API key issues
    if (message.includes('api key') || message.includes('apikey') || message.includes('unauthorized') || message.includes('401')) {
        return 'toasts.apiKeyInvalid';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many') || message.includes('429')) {
        return 'toasts.rateLimitExceeded';
    }

    // Server errors
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('server error')) {
        return 'toasts.serverError';
    }

    // Timeout
    if (message.includes('timeout') || message.includes('timed out') || message.includes('aborted')) {
        return 'toasts.timeout';
    }

    // Return null to use original message
    return '';
}

/**
 * Handle an error with consistent logging and UI feedback
 */
export function handleError(error: Error | string | unknown, context: string, options: ErrorHandlerOptions = {}): void {
    const {
        level = ErrorLevel.ERROR,
        showToast = true,
        rethrow = false,
        useLocale = true
    } = options;

    const rawMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;

    // Console logging with context (always use raw message)
    const logMessage = `[${context}] ${rawMessage}`;

    switch (level) {
        case ErrorLevel.INFO:
            console.info(logMessage);
            break;
        case ErrorLevel.WARNING:
            console.warn(logMessage);
            break;
        case ErrorLevel.CRITICAL:
            console.error('🚨 CRITICAL:', logMessage, stack);
            break;
        default:
            console.error(logMessage, stack);
    }

    // UI feedback - try to use user-friendly message
    if (showToast && window.uiManager) {
        let displayMessage = rawMessage;

        if (useLocale && window.i18n) {
            const localeKey = classifyError(error);
            if (localeKey) {
                displayMessage = window.i18n.t(localeKey);
            }
        }

        window.uiManager.showToast(displayMessage, level === ErrorLevel.WARNING ? 'warning' : 'error');
    }

    // Optional rethrow
    if (rethrow) {
        throw error;
    }
}

/**
 * Create an error handler bound to a specific context
 */
export function createErrorHandler(context: string) {
    return (error: any, options: ErrorHandlerOptions = {}) => handleError(error, context, options);
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(fn: T, context: string, options: ErrorHandlerOptions = {}): (...args: Parameters<T>) => Promise<ReturnType<T> | null> {
    return async (...args: Parameters<T>) => {
        try {
            return await fn(...args);
        } catch (error) {
            handleError(error, context, options);
            return null;
        }
    };
}

/**
 * Try to execute a function, return fallback on error
 */
export function tryCatch<T>(fn: () => T, fallback: T, context: string = 'Unknown'): T {
    try {
        return fn();
    } catch (error) {
        handleError(error, context, { level: ErrorLevel.WARNING, showToast: false });
        return fallback;
    }
}

export default {
    handleError,
    createErrorHandler,
    withErrorHandling,
    tryCatch,
    ErrorLevel
};
