export class HistoryController {
    constructor(stateManager, uiManager) {
        this.state = stateManager;
        this.ui = uiManager;
        this.selectedIds = new Set();
        this.currentFolder = 'all'; // 'all', 'unfiled', or folderId
        this.folders = [];

        console.log("🏛️ HistoryController Instantiated");
        this.init();
    }

    init() {
        document.addEventListener('click', (e) => this.handleClick(e));

        if (window.areComponentsLoaded) {
            this.setupWindow();
        } else {
            document.addEventListener('componentsLoaded', () => {
                this.setupWindow();
            });
        }
    }

    handleClick(e) {
        // ... (existing logic)
        const btn = e.target.closest('button[data-action="gallery"]') ||
            e.target.closest('[data-action="gallery"]');

        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            this.openGallery();
        }
    }

    setupWindow() {
        // Close Button
        const closeBtn = document.querySelector('.window-close-btn[data-target="gallery-window"]');
        if (closeBtn) closeBtn.onclick = () => this.closeGallery();

        // Clear All
        const clearBtn = document.getElementById('clear-history-btn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (this.currentFolder === 'all') {
                    this.ui.showConfirm('האם למחוק את כ-ל ההיסטוריה מכל התיקיות?', async () => {
                        await this.state.clearHistory();
                        this.renderGrid();
                        this.ui.showToast('ההיסטוריה נמחקה', 'success');
                    });
                } else {
                    // Maybe just clear current folder items? For now block.
                    this.ui.showToast('ניתן לנקות הכל רק בתיקייה "כל החפצים"', 'info');
                }
            };
        }

        // Add Folder
        const addFolderBtn = document.getElementById('add-folder-btn');
        if (addFolderBtn) {
            addFolderBtn.onclick = () => this.createNewFolder();
        }

        // Delete Folder
        const delFolderBtn = document.getElementById('delete-folder-btn');
        if (delFolderBtn) {
            delFolderBtn.onclick = () => this.deleteCurrentFolder();
        }

        // Select All
        const selectAll = document.getElementById('gallery-select-all-checkbox');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }

        // Bulk Actions
        const printBtn = document.getElementById('print-selected-btn');
        if (printBtn) printBtn.onclick = () => this.printSelected();

        const deleteBtn = document.getElementById('delete-selected-btn');
        if (deleteBtn) deleteBtn.onclick = () => this.deleteSelected();

        const moveBtn = document.getElementById('move-selected-btn');
        if (moveBtn) moveBtn.onclick = () => this.moveSelected();
    }

    // --- Folders ---

    async refreshFolders() {
        this.folders = await window.storageManager.getAllFolders() || [];
        this.renderSidebar();
    }

    renderSidebar() {
        const list = document.getElementById('folder-list');
        if (!list) return;

        list.innerHTML = '';

        // All
        const createItem = (id, name, icon = '📂') => {
            const btn = document.createElement('button');
            btn.className = `folder-item ${this.currentFolder === id ? 'active' : ''}`;
            btn.style.width = '100%';
            btn.style.textAlign = 'right';
            btn.style.padding = '0.5rem';
            btn.style.background = this.currentFolder === id ? 'rgba(212, 175, 55, 0.2)' : 'transparent';
            btn.style.border = 'none';
            btn.style.color = this.currentFolder === id ? '#ffdea0' : '#ccc';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '4px';
            btn.style.marginBottom = '2px';
            btn.innerHTML = `${icon} ${name}`;

            btn.onclick = () => {
                this.currentFolder = id;
                this.renderSidebar(); // re-render to update active state
                this.renderGrid();
                this.updateToolbarAndHeader(); // Toggle delete folder button
            };
            return btn;
        };

        list.appendChild(createItem('all', 'כל החפצים'));
        // list.appendChild(createItem('unfiled', 'ללא שיוך', '❓')); // Optional

        this.folders.forEach(f => {
            list.appendChild(createItem(f.id, f.name));
        });
    }

    async createNewFolder() {
        const name = prompt("שם התיקייה החדשה:");
        if (!name) return;

        const folder = {
            id: 'folder-' + Date.now(),
            name: name
        };

        await window.storageManager.saveFolder(folder);
        await this.refreshFolders();
    }

    async deleteCurrentFolder() {
        if (this.currentFolder === 'all') return;

        const folder = this.folders.find(f => f.id === this.currentFolder);
        if (!folder) return;

        this.ui.showConfirm(`האם למחוק את התיקייה "${folder.name}"? החפצים בתוכה לא יימחקו אלא יעברו ל"ללא שיוך".`, async () => {
            // Update all cards in this folder to have no folder
            const allCards = await this.state.getHistory();
            const inFolder = allCards.filter(c => c.folder === this.currentFolder);

            // Remove folder tag
            for (const card of inFolder) {
                card.folder = null;
                await window.storageManager.saveCard(card);
            }

            // Delete folder
            await window.storageManager.deleteFolder(this.currentFolder);

            this.currentFolder = 'all';
            await this.refreshFolders();
            this.renderGrid();
            this.ui.showToast('התיקייה נמחקה', 'success');
        });
    }

    updateToolbarAndHeader() {
        const delFolderBtn = document.getElementById('current-folder-actions');
        if (delFolderBtn) {
            if (this.currentFolder === 'all' || this.currentFolder === 'unfiled') {
                delFolderBtn.classList.add('hidden');
            } else {
                delFolderBtn.classList.remove('hidden');
            }
        }
    }

    // --- Selection ---

    async toggleSelectAll(isChecked) {
        if (isChecked) {
            const cards = await this.getFilteredCards();
            cards.forEach(c => this.selectedIds.add(c.id));
        } else {
            this.selectedIds.clear();
        }
        this.renderGrid(); // Re-render to update checkboxes
        this.updateToolbar();
    }

    async getFilteredCards() {
        const all = await this.state.getHistory();
        if (this.currentFolder === 'all') return all;
        if (this.currentFolder === 'unfiled') return all.filter(c => !c.folder);
        return all.filter(c => c.folder === this.currentFolder);
    }

    async moveSelected() {
        const ids = Array.from(this.selectedIds);
        if (ids.length === 0) return;

        // Custom Folder Prompt? Or simple prompt for name? 
        // Ideally a modal with dropdown. For now, let's use a prompt that lists text or something simple.
        // Actually, we can assume the user knows the folder name, or use prompt.
        // Better: native prompt is bad for selection.
        // Let's iterate folders and asking user "To which folder? (Type Number)" is ugly.
        // Let's create a simple HTML select prompt overlay?
        // Reuse UI confirm? No.
        // Let's use `prompt` but listing folders is hard.
        // Hack: "Enter exact Folder Name".

        // Better: "Unfile" or "Move to X".
        // Let's try to mimic a quick prompt.
        let msg = "בחר מספר תיקייה ליעד:\n0. נקה שיוך (ללא תיקייה)\n";
        this.folders.forEach((f, i) => msg += `${i + 1}. ${f.name}\n`);

        const res = prompt(msg);
        if (res === null) return;

        const idx = parseInt(res);
        let targetFolderId = null; // Default unfiled

        if (idx > 0 && idx <= this.folders.length) {
            targetFolderId = this.folders[idx - 1].id;
        } else if (idx !== 0) {
            // Invalid
            return;
        }

        // Apply move
        const allCards = await this.state.getHistory();
        let movedCount = 0;

        for (const id of ids) {
            const card = allCards.find(c => c.id === id);
            if (card) {
                card.folder = targetFolderId;
                await window.storageManager.saveCard(card);
                movedCount++;
            }
        }

        this.selectedIds.clear();
        this.ui.showToast(`${movedCount} חפצים הועברו`, 'success');
        this.renderGrid();
        this.updateToolbar();
    }

    // --- Bulk Actions ---

    async printSelected() {
        const ids = Array.from(this.selectedIds);
        if (ids.length === 0) return;

        if (window.printManager) {
            const history = await this.state.getHistory();
            const cards = history.filter(item => this.selectedIds.has(item.id));
            window.printManager.openPrintModal(cards);
        }
    }

    async deleteSelected() {
        const ids = Array.from(this.selectedIds);
        if (ids.length === 0) return;

        this.ui.showConfirm(`האם למחוק ${ids.length} חפצים שנבחרו?`, async () => {
            await window.storageManager.deleteCards(ids);
            this.selectedIds.clear();
            this.updateToolbar();
            await this.renderGrid();
            this.ui.showToast(`${ids.length} חפצים נמחקו`, 'success');
        });
    }

    updateToolbar() {
        const toolbar = document.getElementById('selection-toolbar');
        const countSpan = document.getElementById('selection-count');
        const clearBtn = document.getElementById('clear-history-btn');
        const selectAll = document.getElementById('gallery-select-all-checkbox');

        if (!toolbar || !countSpan) return;

        const count = this.selectedIds.size;

        // Update Select All state partially if needed?
        // If count > 0 and count < total, indeterminate? 
        // For now simple.

        if (count > 0) {
            toolbar.classList.remove('hidden');
            countSpan.textContent = `${count} נבחרו`;
            if (clearBtn) clearBtn.classList.add('hidden');
        } else {
            toolbar.classList.add('hidden');
            if (clearBtn) clearBtn.classList.remove('hidden');
            if (selectAll) selectAll.checked = false;
        }
    }

    async openGallery() {
        const win = document.getElementById('gallery-window');
        if (win) {
            console.log("🔓 Opening Gallery Window");
            win.classList.remove('hidden');

            await this.refreshFolders();
            await this.renderGrid();
        }
    }

    closeGallery() {
        const win = document.getElementById('gallery-window');
        if (win) win.classList.add('hidden');
    }

    createLightbox() {
        if (this.lightbox) return;

        const lightbox = document.createElement('div');
        lightbox.id = 'gallery-lightbox';
        lightbox.className = 'lightbox hidden';
        lightbox.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); webkit-backdrop-filter: blur(8px); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
            opacity: 0; pointer-events: none; transition: opacity 0.3s;
        `;
        lightbox.innerHTML = `
            <img id="lightbox-img" style="max-width: 90%; max-height: 90%; box-shadow: 0 0 20px rgba(0,0,0,0.5); border-radius: 4px; transform: scale(0.9); transition: transform 0.3s;">
            <button id="lightbox-close" style="position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 2rem; cursor: pointer;">&times;</button>
        `;
        document.body.appendChild(lightbox);

        this.lightbox = lightbox;
        this.lightboxImg = lightbox.querySelector('#lightbox-img');

        // Close events
        const close = () => this.closeLightbox();
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.id === 'lightbox-close') close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) close();
        });
    }

    openLightbox(imageUrl) {
        if (!this.lightbox) this.createLightbox();
        this.lightboxImg.src = imageUrl;
        this.lightbox.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.lightbox.style.opacity = '1';
            this.lightbox.style.pointerEvents = 'auto';
            this.lightboxImg.style.transform = 'scale(1)';
        });
    }

    closeLightbox() {
        if (!this.lightbox) return;
        this.lightbox.style.opacity = '0';
        this.lightbox.style.pointerEvents = 'none';
        this.lightboxImg.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.lightbox.classList.add('hidden');
            this.lightboxImg.src = '';
        }, 300);
    }

    async renderGrid() {
        // Ensure lightbox exists
        this.createLightbox();

        const grid = document.getElementById('history-grid');
        if (!grid) return;

        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">טוען...</div>';

        try {
            const cards = await this.getFilteredCards();

            // Sync Select All checkbox
            const selectAll = document.getElementById('gallery-select-all-checkbox');
            if (selectAll && cards.length > 0) {
                const allSelected = cards.every(c => this.selectedIds.has(c.id));
                selectAll.checked = allSelected;
            } else if (selectAll) {
                selectAll.checked = false;
            }

            grid.innerHTML = '';

            if (cards.length === 0) {
                grid.innerHTML = `
                    <div class="empty-message" style="text-align: center; color: #888; margin-top: 2rem; width: 100%; grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center;">
                        <span>אין חפצים בתיקייה זו.</span>
                        ${this.currentFolder !== 'all' ? '<span style="font-size:0.8em; margin-top:0.5rem;">(גרור חפצים לכאן או השתמש ב"העבר ל...")</span>' : ''}
                    </div>
                `;
                return;
            }

            cards.forEach(item => {
                const card = document.createElement('div');
                card.className = 'gallery-card-item';

                // Highlight if selected
                if (this.selectedIds.has(item.id)) {
                    card.style.borderColor = '#d4af37';
                    card.style.boxShadow = '0 0 0 2px #d4af37';
                }

                card.dataset.id = item.id;

                let displayImage = item.thumbnail;
                let fullImage = item.cardData.imageUrl || item.thumbnail; // Prefer full image for zoom

                if (!displayImage) {
                    let imageUrl = item.cardData.imageUrl;
                    if (imageUrl && !imageUrl.startsWith('blob:')) {
                        displayImage = imageUrl;
                    }
                }
                // For zoom, ALWAYS prefer the generated thumbnail (full card) over raw artwork
                // Only fall back to artwork if thumbnail isn't available (rare)
                if (item.thumbnail && !item.thumbnail.startsWith('blob:')) {
                    fullImage = item.thumbnail;
                } else {
                    fullImage = item.cardData.imageUrl || displayImage;
                }

                const isSelected = this.selectedIds.has(item.id);

                card.innerHTML = `
                    <div class="gallery-thumb-container" style="width: 100%; aspect-ratio: 63/88; background: #222; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                        <img src="${displayImage}" style="width: 100%; height: 100%; object-fit: contain; display: block;" onerror="this.src='assets/textures/stone_slab.png'">
                        <input type="checkbox" class="select-checkbox" ${isSelected ? 'checked' : ''} 
                            style="position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; cursor: pointer; accent-color: #d4af37; z-index: 10;">
                    </div>
                    <div class="history-info">
                        <div class="history-name">${item.name}</div>
                        <div class="history-meta">${new Date(item.savedAt).toLocaleDateString('he-IL')}</div>
                    </div>
                    <div class="history-actions" style="display: flex; gap: 0.5rem; justify-content: center; padding: 0.5rem;">
                         <button class="zoom-btn action-btn" title="הגדל">🔍</button>
                         <button class="load-btn action-btn" title="ערוך">✏️</button>
                         <button class="delete-btn action-btn" title="מחק">🗑️</button>
                    </div>
                `;

                // Events
                const checkbox = card.querySelector('.select-checkbox');
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    if (checkbox.checked) {
                        this.selectedIds.add(item.id);
                        card.style.borderColor = '#d4af37';
                        card.style.boxShadow = '0 0 0 2px #d4af37';
                    } else {
                        this.selectedIds.delete(item.id);
                        card.style.borderColor = '';
                        card.style.boxShadow = '';
                    }
                    this.updateToolbar();
                });

                // Zoom
                card.querySelector('.zoom-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openLightbox(fullImage);
                });

                // Edit (Load)
                card.querySelector('.load-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.state.loadFromHistory(item.id);
                    this.ui.showToast(`חפץ "${item.name}" נטען לעריכה!`, 'success');
                    this.closeGallery();
                });

                // Delete
                card.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.ui.showConfirm(`האם למחוק את "${item.name}"?`, async () => {
                        await this.state.deleteFromHistory(item.id);
                        this.selectedIds.delete(item.id);
                        this.updateToolbar();
                        this.renderGrid();
                        this.ui.showToast('החפץ נמחק', 'success');
                    });
                });

                grid.appendChild(card);
            });

            this.updateToolbar();

        } catch (e) {
            console.error("Error rendering grid:", e);
            grid.innerHTML = '<div style="color:red; text-align:center;">שגיאה בטעינת חפצים</div>';
        }
    }
}
