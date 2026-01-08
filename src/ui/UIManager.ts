// Extend Window interface to include i18n
declare global {
    interface Window {
        i18n?: {
            t: (key: string) => string;
        };
    }
}

// Types
interface UIElements {
    loadingOverlay: HTMLElement | null;
    emptyState: HTMLElement | null;
    skeletonOverlay: HTMLElement | null;
    downloadBtn: HTMLButtonElement | null;
    regenerateControls: HTMLElement | null;
    contentEditor: HTMLElement | null;
    errorDiv: HTMLElement | null;
    toastContainer: HTMLElement | null;
    stickyNote: HTMLElement | null;
    confirmModal: HTMLElement | null;
    confirmMessage: HTMLElement | null;
    confirmOkBtn: HTMLButtonElement | null;
    confirmCancelBtn: HTMLButtonElement | null;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface StickyNoteOptions {
    level?: string | number;
    type?: string;
    subtype?: string;
    ability?: string;
    style?: string;
    attunement?: boolean;
    damage?: string;
    armorClass?: string | number;
}

export interface ColorOption {
    name: string;
    hex: string;
}

export class UIManager {
    private elements: UIElements;

    constructor() {
        this.elements = {
            loadingOverlay: document.getElementById('loading-overlay'),
            emptyState: document.getElementById('empty-state'),
            skeletonOverlay: document.getElementById('skeleton-overlay'),
            downloadBtn: document.getElementById('download-btn') as HTMLButtonElement | null,
            regenerateControls: document.getElementById('regenerate-controls'),
            contentEditor: document.getElementById('content-editor'),
            errorDiv: document.getElementById('error-message'),
            toastContainer: document.getElementById('toast-container'),
            stickyNote: document.getElementById('sticky-note'),
            confirmModal: document.getElementById('confirmation-modal'),
            confirmMessage: document.querySelector('#confirmation-modal .modal-message'),
            confirmOkBtn: document.getElementById('confirm-ok-btn') as HTMLButtonElement | null,
            confirmCancelBtn: document.getElementById('confirm-cancel-btn') as HTMLButtonElement | null
        };
    }

    showLoading(_message: string | null = null): void {
        const _loadingText = window.i18n?.t('preview.loading') || 'Loading...';
        this.elements.loadingOverlay?.classList.remove('hidden');
        if (this.elements.emptyState) this.elements.emptyState.classList.add('hidden');
        if (this.elements.skeletonOverlay) this.elements.skeletonOverlay.classList.remove('hidden');
        if (this.elements.downloadBtn) this.elements.downloadBtn.disabled = true;

        if (this.elements.regenerateControls) this.elements.regenerateControls.classList.add('hidden');
        if (this.elements.contentEditor) this.elements.contentEditor.classList.add('hidden');
        if (this.elements.errorDiv) this.elements.errorDiv.classList.add('hidden');
    }

    hideLoading(): void {
        this.elements.loadingOverlay?.classList.add('hidden');
        if (this.elements.skeletonOverlay) this.elements.skeletonOverlay.classList.add('hidden');
        if (this.elements.regenerateControls) this.elements.regenerateControls.classList.remove('hidden');
        if (this.elements.contentEditor) this.elements.contentEditor.classList.remove('hidden');
        if (this.elements.downloadBtn) this.elements.downloadBtn.disabled = false;
    }

    showToast(message: string, type: ToastType = 'info'): void {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconMap: Record<ToastType, string> = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${iconMap[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;

        let container = this.elements.toastContainer;
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
            this.elements.toastContainer = container;
        }

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after 3s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    updateStickyNote(options: StickyNoteOptions = {}): void {
        if (!this.elements.stickyNote) return;

        const {
            level,
            type,
            subtype,
            ability,
            style,
            attunement,
            damage,
            armorClass
        } = options;

        // Core fields
        const noteLevel = document.getElementById('note-level');
        const noteType = document.getElementById('note-type');
        const noteSubtype = document.getElementById('note-subtype');

        // Extended fields
        const noteAbility = document.getElementById('note-ability');
        const noteStyle = document.getElementById('note-style');
        const noteAttunement = document.getElementById('note-attunement');
        const noteDamage = document.getElementById('note-damage');
        const noteAC = document.getElementById('note-ac');

        // Update core fields
        if (level !== undefined && noteLevel) {
            const levelStr = String(level || '');
            noteLevel.textContent = levelStr.includes('(') ? levelStr.split('(')[0].trim() : levelStr;
        }
        if (type !== undefined && noteType) {
            const typeStr = String(type || '');
            noteType.textContent = typeStr.includes('(') ? typeStr.split('(')[0].trim() : typeStr;
        }
        if (subtype !== undefined && noteSubtype) {
            noteSubtype.textContent = subtype || '-';
        }

        // Update extended fields
        if (ability !== undefined && noteAbility) {
            noteAbility.textContent = ability || '-';
            noteAbility.title = ability || '';
        }
        if (style !== undefined && noteStyle) {
            noteStyle.textContent = style || '-';
        }

        // Update badge modifiers
        if (attunement !== undefined && noteAttunement) {
            noteAttunement.classList.toggle('hidden', !attunement);
        }
        if (damage !== undefined && noteDamage) {
            if (damage) {
                noteDamage.textContent = `⚔️ ${damage}`;
                noteDamage.classList.remove('hidden');
            } else {
                noteDamage.classList.add('hidden');
            }
        }
        if (armorClass !== undefined && noteAC) {
            if (armorClass) {
                noteAC.textContent = `🛡️ AC ${armorClass}`;
                noteAC.classList.remove('hidden');
            } else {
                noteAC.classList.add('hidden');
            }
        }

        this.elements.stickyNote.classList.remove('hidden');
    }

    initColorPicker(colors: ColorOption[], onSelect: (colorName: string) => void): void {
        const colorPalette = document.getElementById('color-palette');
        const imageColorInput = document.getElementById('image-bg-color') as HTMLInputElement | null;

        if (colorPalette && imageColorInput) {
            colorPalette.innerHTML = '';

            colors.forEach(color => {
                const div = document.createElement('div');
                div.className = 'color-option';
                div.style.backgroundColor = color.hex;
                div.title = color.name;
                div.dataset.name = color.name;

                div.addEventListener('click', () => {
                    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
                    div.classList.add('selected');
                    imageColorInput.value = color.name;
                    onSelect(color.name);
                });

                colorPalette.appendChild(div);
            });

            // Default White
            const defaultColor = colorPalette.querySelector('[data-name="White"]') as HTMLElement | null;
            if (defaultColor) {
                defaultColor.classList.add('selected');
                imageColorInput.value = 'White';
            }
        }
    }

    showConfirm(message: string, onConfirm: () => void): void {
        if (!this.elements.confirmModal || !this.elements.confirmOkBtn || !this.elements.confirmCancelBtn) return;

        if (this.elements.confirmMessage) {
            this.elements.confirmMessage.textContent = message;
        }
        this.elements.confirmModal.classList.remove('hidden');

        // Clean up old listeners to prevent multiple firings
        const newOk = this.elements.confirmOkBtn.cloneNode(true) as HTMLButtonElement;
        const newCancel = this.elements.confirmCancelBtn.cloneNode(true) as HTMLButtonElement;

        this.elements.confirmOkBtn.parentNode?.replaceChild(newOk, this.elements.confirmOkBtn);
        this.elements.confirmCancelBtn.parentNode?.replaceChild(newCancel, this.elements.confirmCancelBtn);

        // Re-assign references
        this.elements.confirmOkBtn = newOk;
        this.elements.confirmCancelBtn = newCancel;

        const modal = this.elements.confirmModal;
        this.elements.confirmOkBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            onConfirm();
        });

        this.elements.confirmCancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
}
