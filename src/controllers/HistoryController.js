export class HistoryController {
    constructor(stateManager, uiManager) {
        this.state = stateManager;
        this.ui = uiManager;

        console.log("🏛️ HistoryController Instantiated");
        this.init();
    }

    init() {
        // Use global delegation immediately - no need to wait for components
        // because we listen on 'document' and check the target at click time.
        document.addEventListener('click', (e) => this.handleClick(e));

        // We still need to setup the window events (close button) once it exists
        if (window.areComponentsLoaded) {
            this.setupWindow();
        } else {
            document.addEventListener('componentsLoaded', () => {
                this.setupWindow();
            });
        }
    }

    handleClick(e) {
        // Try multiple selectors to be safe
        const btn = e.target.closest('button[data-action="gallery"]') ||
            e.target.closest('[data-action="gallery"]');

        if (btn) {
            console.log("🖱️ Gallery button clicked (Delegated)", btn);
            e.preventDefault();
            e.stopPropagation();
            this.openGallery();
        }
    }

    setupWindow() {
        const closeBtn = document.querySelector('.window-close-btn[data-target="gallery-window"]');
        if (closeBtn) {
            // Remove old listener if any (not critical as we recreate controller only on reload usually)
            closeBtn.onclick = () => this.closeGallery();
        }

        const clearBtn = document.getElementById('clear-history-btn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                this.ui.showConfirm('האם אתה בטוח שברצונך למחוק את כל ההיסטוריה?', () => {
                    this.state.clearHistory();
                    this.renderGrid();
                    this.ui.showToast('ההיסטוריה נמחקה', 'success');
                });
            };
        }
    }

    openGallery() {
        const win = document.getElementById('gallery-window');
        if (win) {
            console.log("🔓 Opening Gallery Window");
            win.classList.remove('hidden');
            this.renderGrid();
        } else {
            console.error("❌ Gallery Window element (#gallery-window) not found in DOM");
        }
    }

    closeGallery() {
        const win = document.getElementById('gallery-window');
        if (win) {
            win.classList.add('hidden');
        }
    }

    renderGrid() {
        const grid = document.getElementById('history-grid');
        if (!grid) return;

        const history = this.state.getHistory();
        grid.innerHTML = '';

        if (history.length === 0) {
            grid.innerHTML = `
                <div class="empty-message" style="text-align: center; color: #888; margin-top: 2rem; width: 100%; grid-column: 1 / -1;">
                    אין כרגע חפצים בהיסטוריה.
                    <br>
                    צור חפצים חדשים והם יופיעו כאן!
                </div>
            `;
            return;
        }

        history.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-item';

            // Use thumbnail if available (Priority 1), otherwise item image (Priority 2), otherwise generic (Priority 3)
            let displayImage = item.thumbnail;

            if (!displayImage) {
                // Fallback to old behavior for legacy cards
                let imageUrl = item.cardData.imageUrl;
                if (imageUrl && !imageUrl.startsWith('blob:')) {
                    displayImage = imageUrl;
                }
            }

            displayImage = displayImage || 'assets/textures/stone_slab.png';

            card.innerHTML = `
                <div class="history-preview" style="background-image: url('${displayImage}'); background-size: cover; background-position: top center;"></div>
                <div class="history-info">
                    <div class="history-name">${item.name}</div>
                    <div class="history-meta">${new Date(item.savedAt).toLocaleDateString('he-IL')}</div>
                </div>
                <div class="history-actions">
                    <button class="load-btn">טען</button>
                    <button class="delete-btn">&times;</button>
                </div>
            `;

            // Load Click
            card.querySelector('.load-btn').addEventListener('click', () => {
                this.state.loadFromHistory(item.id);
                this.ui.showToast(`חפץ "${item.name}" נטען!`, 'success');
                this.closeGallery();
            });

            // Delete Click
            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.ui.showConfirm(`האם למחוק את "${item.name}"?`, () => {
                    this.state.deleteFromHistory(item.id);
                    this.renderGrid();
                    this.ui.showToast('החפץ נמחק', 'success');
                });
            });

            grid.appendChild(card);
        });
    }
}
