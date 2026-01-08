/**
 * Get rarity based on character level range
 * Based on DMG guidelines:
 * - Common/Uncommon: 1-4 (low levels, minor magic)
 * - Rare: 5-10 (mid levels, significant magic)
 * - Very Rare: 11-16 (high levels, powerful magic)
 * - Legendary: 17+ (epic levels, legendary items)
 */
export function getRarityFromLevel(level: string): string {
    if (level === '1-4') return 'uncommon';  // Changed from 'common' - allow minor magic at low levels
    if (level === '5-10') return 'rare';     // Changed from 'uncommon'
    if (level === '11-16') return 'very rare'; // NEW - was 'rare'
    if (level === '17+') return 'legendary';
    return 'uncommon';
}

/**
 * Debounce function to limit rapid calls
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number = 300): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    return function (this: any, ...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format gold value with commas
 */
export function formatGold(gold: number | string): string {
    const num = typeof gold === 'string' ? parseInt(gold, 10) : gold;
    if (isNaN(num)) return String(gold);
    return num.toLocaleString('he-IL');
}

/**
 * Convert Blob URL to Base64 Data URL
 */
export async function blobToBase64(blobUrl: string): Promise<string> {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to convert blob to base64:", e);
        return blobUrl; // Fallback
    }
}
