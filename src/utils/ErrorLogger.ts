/**
 * ErrorLogger - Centralized Error Handling
 * Provides consistent error logging, history tracking, and user-friendly messages
 */

// Error history storage
const errorHistory: ErrorEntry[] = [];
const MAX_HISTORY = 100;

interface ErrorEntry {
    timestamp: string;
    source: string;
    message: string;
    details?: unknown;
    stack?: string;
}

/**
 * Log an error with context
 */
export function logError(
    source: string,
    message: string,
    error?: unknown
): void {
    const entry: ErrorEntry = {
        timestamp: new Date().toISOString(),
        source,
        message,
        details: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
    };

    // Add to history
    errorHistory.push(entry);
    if (errorHistory.length > MAX_HISTORY) {
        errorHistory.shift();
    }

    // Console output with styling
    console.error(
        `%c[${source}]%c ${message}`,
        'color: #ff6b6b; font-weight: bold;',
        'color: inherit;',
        error || ''
    );

    // Emit event for UI notification
    window.dispatchEvent(new CustomEvent('app-error', {
        detail: { source, message, error: entry.details }
    }));
}

/**
 * Log a warning (non-critical issue)
 */
export function logWarning(source: string, message: string): void {
    console.warn(
        `%c[${source}]%c ${message}`,
        'color: #ffa502; font-weight: bold;',
        'color: inherit;'
    );
}

/**
 * Log info for debugging
 */
export function logInfo(source: string, message: string, data?: unknown): void {
    console.log(
        `%c[${source}]%c ${message}`,
        'color: #3498db; font-weight: bold;',
        'color: inherit;',
        data || ''
    );
}

/**
 * Get error history for debugging
 */
export function getErrorHistory(): ErrorEntry[] {
    return [...errorHistory];
}

/**
 * Clear error history
 */
export function clearErrorHistory(): void {
    errorHistory.length = 0;
}

/**
 * Format error for display to user
 */
export function formatUserError(error: unknown): string {
    if (error instanceof Error) {
        // Common errors with friendly messages
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return 'בעיית חיבור לאינטרנט. אנא בדוק את החיבור ונסה שוב.';
        }
        if (error.message.includes('quota') || error.message.includes('storage')) {
            return 'האחסון המקומי מלא. נסה למחוק קלפים ישנים.';
        }
        if (error.message.includes('API') || error.message.includes('key')) {
            return 'בעיה עם מפתח ה-API. בדוק את ההגדרות.';
        }
        return error.message;
    }
    return String(error);
}

/**
 * Try-catch wrapper with automatic logging
 */
export async function trySafe<T>(
    source: string,
    operation: string,
    fn: () => Promise<T>
): Promise<T | null> {
    try {
        return await fn();
    } catch (error) {
        logError(source, `Failed: ${operation}`, error);
        return null;
    }
}

/**
 * Sync version of trySafe
 */
export function trySafeSync<T>(
    source: string,
    operation: string,
    fn: () => T
): T | null {
    try {
        return fn();
    } catch (error) {
        logError(source, `Failed: ${operation}`, error);
        return null;
    }
}

// Export default object for convenience
export default {
    error: logError,
    warn: logWarning,
    info: logInfo,
    getHistory: getErrorHistory,
    clear: clearErrorHistory,
    format: formatUserError,
    trySafe,
    trySafeSync
};
