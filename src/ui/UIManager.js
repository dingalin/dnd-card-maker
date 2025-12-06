export class UIManager {
    constructor() {
        this.elements = {
            loadingOverlay: document.getElementById('loading-overlay'),
            emptyState: document.getElementById('empty-state'),
            skeletonOverlay: document.getElementById('skeleton-overlay'),
            downloadBtn: document.getElementById('download-btn'),
            regenerateControls: document.getElementById('regenerate-controls'),
            contentEditor: document.getElementById('content-editor'),
            errorDiv: document.getElementById('error-message'),
            toastContainer: document.getElementById('toast-container'),
            stickyNote: document.getElementById('sticky-note')
        };
    }

    showLoading(message = 'טוען...') {
        this.elements.loadingOverlay.classList.remove('hidden');
        if (this.elements.emptyState) this.elements.emptyState.classList.add('hidden');
        if (this.elements.skeletonOverlay) this.elements.skeletonOverlay.classList.remove('hidden');
        if (this.elements.downloadBtn) this.elements.downloadBtn.disabled = true;

        if (this.elements.regenerateControls) this.elements.regenerateControls.classList.add('hidden');
        if (this.elements.contentEditor) this.elements.contentEditor.classList.add('hidden');
        if (this.elements.errorDiv) this.elements.errorDiv.classList.add('hidden');
    }

    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
        if (this.elements.skeletonOverlay) this.elements.skeletonOverlay.classList.add('hidden');
        if (this.elements.regenerateControls) this.elements.regenerateControls.classList.remove('hidden');
        if (this.elements.contentEditor) this.elements.contentEditor.classList.remove('hidden');
        if (this.elements.downloadBtn) this.elements.downloadBtn.disabled = false;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconMap = {
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

    updateStickyNote(level, type, subtype) {
        if (!this.elements.stickyNote) return;

        const noteLevel = document.getElementById('note-level');
        const noteType = document.getElementById('note-type');
        const noteSubtype = document.getElementById('note-subtype');

        if (noteLevel) noteLevel.textContent = level.split('(')[0].trim();
        if (noteType) noteType.textContent = type.split('(')[0].trim();
        if (noteSubtype) noteSubtype.textContent = subtype || '-';

        this.elements.stickyNote.classList.remove('hidden');
    }

    initColorPicker(colors, onSelect) {
        const colorPalette = document.getElementById('color-palette');
        const imageColorInput = document.getElementById('image-bg-color');

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
            const defaultColor = colorPalette.querySelector('[data-name="White"]');
            if (defaultColor) {
                defaultColor.classList.add('selected');
                imageColorInput.value = 'White';
            }
        }
    }
}
