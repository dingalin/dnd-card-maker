import type { LayoutCalculator } from '../../utils/LayoutCalculator';
import type { LassoTool } from '../../utils/LassoTool';

// Types
interface SafeArea {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
}

interface LayoutOffsets {
    [key: string]: number;
}

interface LayoutFontSizes {
    name?: number;
    [key: string]: number | undefined;
}

interface LayoutImageSettings {
    scale?: number;
    [key: string]: number | undefined;
}

interface LayoutResult {
    offsets: LayoutOffsets;
    fontSizes: LayoutFontSizes;
    imageSettings: LayoutImageSettings;
}

interface CalculatedLayout {
    layout: LayoutResult;
    safeArea: SafeArea;
}

interface DetectedArea {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

interface StateManager {
    updateOffset: (key: string, value: number) => void;
    updateFontSize: (key: string, delta: number) => void;
    saveCurrentCard: () => void;
}

interface Settings {
    [key: string]: unknown;
}

interface CardData {
    [key: string]: unknown;
}

export class AutoLayoutManager {
    private state: StateManager;

    constructor(stateManager: StateManager) {
        this.state = stateManager;
    }

    async calculateAutoLayout(
        cardData: CardData,
        _settings: Settings,
        _useDetection: boolean = false
    ): Promise<CalculatedLayout> {
        // Import utilities dynamically
        const { LayoutCalculator } = await import('../../utils/LayoutCalculator') as { LayoutCalculator: typeof LayoutCalculator };

        // Use the NEW middle/balanced layout that sets all sliders to midpoint values
        // This gives users room to adjust elements in BOTH directions (up/down, bigger/smaller)
        const layout = LayoutCalculator.calculateMiddleLayout(cardData);

        console.log('AutoLayoutManager: Using MIDDLE/BALANCED layout for user adjustment flexibility');
        console.log('AutoLayoutManager: Calculated layout:', layout);

        // Return with a placeholder safeArea for compatibility
        const safeArea: SafeArea = {
            top: 85,
            bottom: 920,
            left: 70,
            right: 680,
            width: 610,
            height: 835
        };

        return { layout, safeArea };
    }

    async openLassoTool(
        templateImg: HTMLImageElement,
        canvas: HTMLCanvasElement,
        onApply: (detectedArea: DetectedArea) => void
    ): Promise<void> {
        if (!templateImg || !templateImg.complete || templateImg.naturalWidth === 0) {
            throw new Error('Template not ready');
        }

        const { LassoTool } = await import('../../utils/LassoTool') as { LassoTool: typeof LassoTool };
        const lasso = new LassoTool();

        lasso.open(templateImg, canvas, (detectedArea: DetectedArea) => {
            console.log('Lasso detected area:', detectedArea);
            onApply(detectedArea);
        });
    }

    async calculateLayoutWithArea(
        cardData: CardData,
        safeArea: SafeArea,
        settings: Settings
    ): Promise<LayoutResult> {
        const { LayoutCalculator } = await import('../../utils/LayoutCalculator') as { LayoutCalculator: typeof LayoutCalculator };
        return LayoutCalculator.calculateLayoutWithSafeArea(cardData, safeArea, settings);
    }

    applyLayoutToState(layout: LayoutResult): void {
        // Apply offsets
        for (const [key, value] of Object.entries(layout.offsets)) {
            if (typeof value === 'number') {
                this.state.updateOffset(key, value);
            }
        }

        // Apply font sizes
        if (layout.fontSizes.name) {
            const defaultSize = 48;
            const delta = layout.fontSizes.name - defaultSize;
            if (delta !== 0) {
                this.state.updateFontSize('name', delta);
            }
        }

        // Apply image scale
        if (layout.imageSettings.scale) {
            this.state.updateOffset('imageScale', layout.imageSettings.scale);
        }

        this.state.saveCurrentCard();
    }
}
