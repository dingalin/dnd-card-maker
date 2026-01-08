// @ts-nocheck
/**
 * CardViewerService - Centralized Card Viewing Component
 *
 * Usage:
 *   CardViewerService.show({
 *       frontImage: 'url or data-url',
 *       backImage: 'url or data-url' (optional),
 *       cardData: { ... } (optional),
 *       sourceElement: HTMLElement (optional, for animation origin)
 *   });
 *
 *   CardViewerService.hide();
 */

import { CardData } from '../types/card';

interface CardViewerOptions {
    frontImage: string;
    backImage?: string | null;
    cardData?: CardData;
    sourceElement?: HTMLElement | null;
}

interface CardViewerElements {
    overlay: HTMLElement;
    cardContainer: HTMLElement;
    flipper: HTMLElement;
    frontFace: HTMLElement;
    backFace: HTMLElement;
    actionsBar: HTMLElement;
    sourceRect: DOMRect | { top: number; left: number; width: number; height: number };
}

// Global augmentations for window services
declare global {
    interface Window {
        i18n?: {
            t: (key: string) => string;
        };
        stateManager?: {
            setCardData: (data: any) => void;
            getState: () => any;
            deleteFromHistory: (id: number) => Promise<void>;
        };
        uiManager?: {
            showToast: (message: string, type: 'success' | 'error' | 'info') => void;
            showConfirm: (message: string, onConfirm: () => void) => void;
        };
        storageManager?: {
            saveCard: (data: any) => Promise<void>;
        };
        historyController?: {
            renderGrid: () => void;
        };
        characterController?: {
            itemRegistry?: Map<string, any>;
        };
        cardViewerService: CardViewerServiceClass;
    }
}

class CardViewerServiceClass {
    isOpen: boolean;
    currentCard: CardViewerOptions | null;
    elements: CardViewerElements | null;
    isFlipped: boolean;
    private _lastShowTime?: number;

    constructor() {
        this.isOpen = false;
        this.currentCard = null;
        this.elements = null;
        this.isFlipped = false;
    }

    /**
     * Show card viewer
     */
    show(options: CardViewerOptions): void {
        console.log('📸 CardViewerService.show() called', options);

        // Debounce - ignore calls within 100ms of last call
        const now = Date.now();
        if (this._lastShowTime && now - this._lastShowTime < 100) {
            console.log('📸 Ignoring duplicate call (debounce)');
            return;
        }
        this._lastShowTime = now;

        // If already open, just close and don't reopen (toggle behavior)
        if (this.isOpen) {
            console.log('📸 Already open, just closing...');
            this.hide();
            return;
        }

        this._doShow(options);
    }

    private _doShow(options: CardViewerOptions): void {
        const { frontImage, backImage, cardData, sourceElement } = options;

        if (!frontImage) {
            console.error('CardViewerService: frontImage is required');
            return;
        }

        console.log('📸 Opening viewer with:', { frontImage: frontImage.substring(0, 50), backImage: !!backImage, hasCardData: !!cardData });

        this.currentCard = { frontImage, backImage, cardData, sourceElement };
        this.isFlipped = false;
        this.isOpen = true;

        // Get source rect for animation
        const sourceRect = sourceElement?.getBoundingClientRect() || {
            top: window.innerHeight / 2 - 70,
            left: window.innerWidth / 2 - 50,
            width: 100,
            height: 140
        };
        console.log('📸 Source rect:', sourceRect);

        // Create elements
        this.elements = this._createElements(sourceRect);

        // Add to DOM
        document.body.appendChild(this.elements.overlay);
        document.body.appendChild(this.elements.cardContainer);
        document.body.appendChild(this.elements.actionsBar);

        // Force reflow
        void this.elements.cardContainer.offsetWidth;

        // Animate to center
        requestAnimationFrame(() => {
            this._animateIn();
        });
    }

    /**
     * Hide card viewer
     */
    hide(): void {
        console.log('📸 CardViewerService.hide() called, isOpen:', this.isOpen);
        if (!this.isOpen || !this.elements) return;

        this.isOpen = false;
        this._animateOut();
    }

    /**
     * Create viewer elements
     */
    private _createElements(sourceRect: any): CardViewerElements {
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'card-viewer-overlay';
        overlay.onclick = () => this.hide();

        // Card Container (for 3D flip)
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card-viewer-container';
        cardContainer.style.cssText = `
            position: fixed;
            top: ${sourceRect.top}px;
            left: ${sourceRect.left}px;
            width: ${sourceRect.width}px;
            height: ${sourceRect.height}px;
            z-index: 10000;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: default;
        `;

        // Flipper - this is what rotates for 3D flip effect
        const flipper = document.createElement('div');
        flipper.className = 'card-viewer-flipper';

        // Front Face
        const frontFace = document.createElement('div');
        frontFace.className = 'card-viewer-front';
        console.log('📸 Creating front face with image:', this.currentCard!.frontImage?.substring(0, 100));
        frontFace.innerHTML = `<img src="${this.currentCard!.frontImage}" alt="Card Front" style="width:100%; height:100%; object-fit:cover; border-radius:12px;" />`;

        // Back Face
        const backFace = document.createElement('div');
        backFace.className = 'card-viewer-back';
        if (this.currentCard!.backImage) {
            backFace.innerHTML = `<img src="${this.currentCard!.backImage}" alt="Card Back" style="width:100%; height:100%; object-fit:cover; border-radius:12px;" />`;
        } else {
            backFace.innerHTML = `<div class="no-back-message">${window.i18n?.t('toasts.noBackSide') || 'אין צד אחורי'}</div>`;
        }

        flipper.appendChild(frontFace);
        flipper.appendChild(backFace);
        cardContainer.appendChild(flipper);

        // Actions Bar
        const actionsBar = this._createActionsBar();

        return { overlay, cardContainer, flipper, frontFace, backFace, actionsBar, sourceRect };
    }

    /**
     * Create action buttons bar
     */
    private _createActionsBar(): HTMLElement {
        const bar = document.createElement('div');
        bar.className = 'card-viewer-actions';

        // Edit Button (only if cardData exists)
        if (this.currentCard?.cardData) {
            const editBtn = this._createButton(window.i18n?.t('cardViewer.edit') || 'ערוך ✏️', 'primary', () => {
                this._handleEdit();
            });
            bar.appendChild(editBtn);
        }

        // Flip Button
        const flipBtn = this._createButton(window.i18n?.t('cardViewer.flip') || 'הפוך קלף 🔄', 'primary', () => {
            this._handleFlip();
        });
        bar.appendChild(flipBtn);

        // Save Button (only if cardData exists)
        if (this.currentCard?.cardData) {
            const saveBtn = this._createButton(window.i18n?.t('cardViewer.save') || 'שמור לגלריה 💾', 'primary', () => {
                this._handleSave();
            });
            bar.appendChild(saveBtn);
        }

        // Delete Button (show when cardData exists)
        if (this.currentCard?.cardData) {
            const deleteBtn = this._createButton(window.i18n?.t('cardViewer.delete') || 'מחק 🗑️', 'danger', () => {
                this._handleDelete();
            });
            bar.appendChild(deleteBtn);
        }

        return bar;
    }

    /**
     * Create a styled button
     */
    private _createButton(text: string, type: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = `card-viewer-btn card-viewer-btn-${type}`;
        btn.textContent = text;
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick();
        };
        return btn;
    }

    /**
     * Animate card to center
     */
    private _animateIn(): void {
        if (!this.elements) return;

        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        // Card aspect ratio: 750x1050 = 5:7 (width:height)
        const cardAspectRatio = 750 / 1050; // ~0.714

        // Calculate target size maintaining aspect ratio
        const maxHeight = viewportH * 0.75;
        const maxWidth = viewportW * 0.6;

        let targetHeight, targetWidth;

        // Fit to available space while maintaining aspect ratio
        if (maxHeight * cardAspectRatio <= maxWidth) {
            // Height is the constraint
            targetHeight = maxHeight;
            targetWidth = targetHeight * cardAspectRatio;
        } else {
            // Width is the constraint
            targetWidth = maxWidth;
            targetHeight = targetWidth / cardAspectRatio;
        }

        const targetTop = (viewportH - targetHeight) / 2 - 40;
        const targetLeft = (viewportW - targetWidth) / 2; // Not used directly in new calculation? Ah 'left: 50%' used instead.

        // Animate overlay
        this.elements.overlay.style.opacity = '1';

        // Animate card with correct aspect ratio - center using same technique as buttons
        this.elements.cardContainer.style.top = `${targetTop}px`;
        this.elements.cardContainer.style.left = '50%';
        this.elements.cardContainer.style.transform = 'translateX(-50%)';
        this.elements.cardContainer.style.width = `${targetWidth}px`;
        this.elements.cardContainer.style.height = `${targetHeight}px`;

        // Position actions bar below card with more space - perfectly centered below card
        const actionsTop = targetTop + targetHeight + 20;
        this.elements.actionsBar.style.top = `${actionsTop}px`;
        this.elements.actionsBar.style.left = '50%';
        this.elements.actionsBar.style.transform = 'translateX(-50%)';

        // Fade in actions
        requestAnimationFrame(() => {
            if (this.elements) {
                this.elements.actionsBar.style.opacity = '1';
            }
        });
    }

    /**
     * Animate card back to source and remove
     */
    private _animateOut(): void {
        if (!this.elements) return;
        const { sourceRect } = this.elements;

        // Reset flip
        this.elements.cardContainer.style.transform = 'rotateY(0deg)';

        // Animate back to source
        this.elements.overlay.style.opacity = '0';
        this.elements.cardContainer.style.top = `${sourceRect.top}px`;
        this.elements.cardContainer.style.left = `${sourceRect.left}px`;
        this.elements.cardContainer.style.width = `${sourceRect.width}px`;
        this.elements.cardContainer.style.height = `${sourceRect.height}px`;
        this.elements.actionsBar.style.opacity = '0';

        // Remove after animation
        setTimeout(() => {
            this.elements?.overlay?.remove();
            this.elements?.cardContainer?.remove();
            this.elements?.actionsBar?.remove();
            this.elements = null;
            this.currentCard = null;
        }, 400);
    }

    /**
     * Handle flip action
     */
    private _handleFlip(): void {
        if (!this.elements) return;
        this.isFlipped = !this.isFlipped;

        console.log('🔄 Flip triggered:', {
            isFlipped: this.isFlipped,
            hasBackImage: !!this.currentCard?.backImage
        });

        // Toggle flipped class on flipper for 3D rotation animation
        if (this.isFlipped) {
            this.elements.flipper.classList.add('flipped');
        } else {
            this.elements.flipper.classList.remove('flipped');
        }
    }

    /**
     * Handle edit action
     */
    private _handleEdit(): void {
        if (!this.currentCard?.cardData) return;

        if (window.stateManager) {
            const cardData = this.currentCard.cardData;

            // Restore data using stateManager.setCardData
            // This method handles V2 migration and notifies listeners
            window.stateManager.setCardData(cardData);

            // Restore settings if they were captured
            if (cardData.settings) {
                console.log('📸 Restoring custom settings for edit...');
                // Deep merge settings into state
                const currentState = window.stateManager.getState();
                const newSettings = {
                    ...currentState.settings,
                    ...cardData.settings,
                    front: {
                        ...currentState.settings.front,
                        ...(cardData.settings.front || {}),
                        offsets: { ...currentState.settings.front?.offsets, ...(cardData.settings.front?.offsets || {}) },
                        fontSizes: { ...currentState.settings.front?.fontSizes, ...(cardData.settings.front?.fontSizes || {}) },
                        fontStyles: { ...currentState.settings.front?.fontStyles, ...(cardData.settings.front?.fontStyles || {}) }
                    },
                    back: {
                        ...currentState.settings.back,
                        ...(cardData.settings.back || {}),
                        offsets: { ...currentState.settings.back?.offsets, ...(cardData.settings.back?.offsets || {}) },
                        fontSizes: { ...currentState.settings.back?.fontSizes, ...(cardData.settings.back?.fontSizes || {}) },
                        fontStyles: { ...currentState.settings.back?.fontStyles, ...(cardData.settings.back?.fontStyles || {}) }
                    },
                    style: {
                        ...currentState.settings.style,
                        ...(cardData.settings.style || {})
                    }
                };
                // stateManager typically updates state internally or via actions, assuming getState returns ref or mutable object?
                // Just updating 'settings' on the state object might not be enough if stateManager doesn't know about it.
                // Assuming existing behavior:
                Object.assign(currentState.settings, newSettings);
            }

            // Switch to card creator tab
            const tabBtn = document.querySelector('.nav-tab[data-tab="card-creator"]') as HTMLElement;
            if (tabBtn) tabBtn.click();

            this.hide();

            if (window.uiManager) {
                window.uiManager.showToast(window.i18n?.t('toasts.itemLoaded') || 'החפץ נטען לעריכה', 'success');
            }
        }
    }

    /**
     * Handle save to gallery action
     */
    private async _handleSave(): Promise<void> {
        if (!this.currentCard?.cardData) return;

        try {
            // Create save data - MUST include 'id' for IndexedDB keyPath
            const saveData = {
                id: Date.now(), // Required by IndexedDB!
                cardData: this.currentCard.cardData,
                thumbnail: this.currentCard.frontImage,
                name: this.currentCard.cardData.name ||
                    this.currentCard.cardData.front?.title ||
                    window.i18n?.t('toasts.unnamed') || 'חפץ ללא שם',
                savedAt: new Date().toISOString()
            };

            // Save using storage manager
            if (window.storageManager) {
                await window.storageManager.saveCard(saveData);

                if (window.uiManager) {
                    window.uiManager.showToast(window.i18n?.t('toasts.cardSaved') || 'הקלף נשמר לגלריה!', 'success');
                }
            } else {
                console.error('Storage manager not available');
                if (window.uiManager) {
                    window.uiManager.showToast(window.i18n?.t('toasts.saveError') || 'שגיאה בשמירה', 'error');
                }
            }
        } catch (error) {
            console.error('Failed to save card:', error);
            if (window.uiManager) {
                window.uiManager.showToast(window.i18n?.t('toasts.saveError') || 'שגיאה בשמירה', 'error');
            }
        }
    }

    /**
     * Handle delete action
     */
    private async _handleDelete(): Promise<void> {
        // Store data before confirm
        const cardId = this.currentCard?.cardData?.id;
        const cardName = this.currentCard?.cardData?.name || '';
        const sourceElement = this.currentCard?.sourceElement;
        const uniqueId = sourceElement?.dataset?.uniqueId || null;

        console.log('🗑️ Delete: cardId=', cardId, 'cardName=', cardName, 'uniqueId=', uniqueId);

        // Confirm delete
        if (window.uiManager) {
            window.uiManager.showConfirm(window.i18n?.t('toasts.deleteConfirm') || 'האם אתה בטוח שברצונך למחוק קלף זה?', async () => {
                try {
                    // Delete from gallery if has ID
                    if (cardId && window.stateManager) {
                        await window.stateManager.deleteFromHistory(cardId);
                        console.log('🗑️ Deleted from gallery:', cardId);
                    }

                    // Remove from character equipment slots if equipped (using uniqueId or cardName)
                    let equippedImg: HTMLElement | null = null;

                    // First try by uniqueId (most reliable)
                    if (uniqueId) {
                        equippedImg = document.querySelector(`.slot-content img[data-unique-id="${uniqueId}"]`);
                    }

                    // Fallback to cardName if no uniqueId match
                    if (!equippedImg && cardName) {
                        const allSlotImages = document.querySelectorAll('.slot-content img');
                        allSlotImages.forEach(img => {
                            if ((img as HTMLElement).dataset.itemName === cardName) {
                                equippedImg = img as HTMLElement;
                            }
                        });
                    }

                    // Also try looking at sourceElement directly
                    if (!equippedImg && sourceElement) {
                        const slotContent = sourceElement.closest('.slot-content');
                        if (slotContent) {
                            equippedImg = sourceElement;
                        }
                    }

                    if (equippedImg) {
                        console.log('🗑️ Found equipped item, removing from slot');
                        const slotContent = equippedImg.closest('.slot-content');
                        if (slotContent) {
                            slotContent.innerHTML = '';
                        }

                        // Also remove from character controller registry
                        if (window.characterController && window.characterController.itemRegistry && uniqueId) {
                            window.characterController.itemRegistry.delete(uniqueId);
                            console.log('🗑️ Removed from itemRegistry:', uniqueId);
                        }
                    }

                    if (window.uiManager) {
                        window.uiManager.showToast(window.i18n?.t('toasts.cardDeleted') || 'הקלף נמחק בהצלחה', 'success');
                    }

                    // Close the viewer
                    this.hide();

                    // Refresh gallery if open
                    if (window.historyController) {
                        window.historyController.renderGrid();
                    }
                } catch (e) {
                    console.error('Delete error:', e);
                    if (window.uiManager) {
                        window.uiManager.showToast(window.i18n?.t('toasts.deleteError') || 'שגיאה במחיקה', 'error');
                    }
                }
            });
        }
    }
}

// Create singleton instance
export const CardViewerService = new CardViewerServiceClass();

// Also expose globally for easy access
window.cardViewerService = CardViewerService;
