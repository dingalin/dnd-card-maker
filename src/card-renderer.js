// detect base path for github pages or local development
/* 
 * NOTE: Base path logic is no longer needed for assets imported via Vite, 
 * but kept if needed for other dynamically constructed paths.
 */
// const getBasePath = () => {
//     const path = window.location.pathname;
//     if (path.includes('/dnd-card-maker/')) return '/dnd-card-maker/';
//     return '/';
// };
// const BASE_PATH = getBasePath();

// Import assets to let Vite handle the path resolution

// FIXED: Use public path with explicit BASE_URL for GitHub Pages compatibility
const cardTemplateUrl = `${import.meta.env.BASE_URL}assets/card-template.png`;
console.log("DEBUG: BASE_URL =", import.meta.env.BASE_URL);
console.log("DEBUG: Constructed cardTemplateUrl =", cardTemplateUrl);

class CardRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.template = new Image();
        this.templateLoaded = false;
        this.fontsLoaded = false;
        this.lastImageUrl = null;
        this.lastImage = null;

        // Create a promise that resolves when template is loaded
        this.templateReady = this._loadTemplate();

        // Wait for fonts
        document.fonts.ready.then(() => {
            this.fontsLoaded = true;
            console.log("DEBUG: Fonts loaded");
        });
    }

    async _loadTemplate() {
        console.log("CardRenderer: Loading template from URL:", cardTemplateUrl);

        try {
            // Use fetch to get exact network status
            const response = await fetch(cardTemplateUrl);
            console.log("DEBUG: Fetch status:", response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            console.log("DEBUG: Blob created, size:", blob.size);

            await new Promise((resolve, reject) => {
                this.template.onload = () => {
                    console.log("CardRenderer: Template loaded successfully from Blob");
                    console.log("DEBUG: Template dimensions:", this.template.naturalWidth, "x", this.template.naturalHeight);
                    URL.revokeObjectURL(objectUrl); // Cleanup
                    resolve();
                };
                this.template.onerror = (e) => reject(new Error("Image onload failed via Blob"));
                this.template.src = objectUrl;
            });

            if (this.template.naturalWidth === 0) {
                alert("CRITICAL: Template loaded but has 0 width. The file might be corrupted or empty.");
            } else {
                // FIXED: Set canvas resolution to STANDARD size (750x1050)
                // This ensures text and layout coordinates are always correct regardless of template size.
                console.log(`CardRenderer: Enforcing standard canvas resolution 750x1050`);
                this.canvas.width = 750;
                this.canvas.height = 1050;
            }

            this.templateLoaded = true;
        } catch (e) {
            console.error("CardRenderer: Failed to load template!", e);
            alert(`Error loading card template: ${e.message}. \nPath: ${cardTemplateUrl}`);
            this.templateLoaded = false;
        }
    }

    async setTemplate(url) {
        return new Promise((resolve, reject) => {
            this.template.src = url;
            this.template.onload = () => {
                console.log("CardRenderer: New template loaded from:", url.substring(0, 50) + "...");
                this.templateLoaded = true;
                // Set canvas dimensions (this clears the canvas, but we'll trigger re-render)
                this.canvas.width = 750;
                this.canvas.height = 1050;
                // Draw the template immediately so it's visible
                this.ctx.drawImage(this.template, 0, 0, 750, 1050);
                console.log("CardRenderer: Template drawn to canvas");
                resolve();
            };
            this.template.onerror = (e) => {
                console.error("CardRenderer: Failed to load new template", e);
                reject(e);
            };
        });
    }

    async render(sourceData, options = {}, isFlipped = false) {
        // --- V2 Data Normalization ---
        const cardData = sourceData.front ? {
            ...sourceData,
            name: sourceData.front.title,
            typeHe: sourceData.front.type,
            rarityHe: sourceData.front.rarity,
            gold: sourceData.front.gold,
            imageUrl: sourceData.front.imageUrl,
            quickStats: sourceData.front.quickStats || '', // NEW
            abilityName: sourceData.back?.title || '',
            abilityDesc: sourceData.back?.mechanics || '',
            description: sourceData.back?.lore || ''
        } : sourceData;

        console.log(`CardRenderer: Rendering ${isFlipped ? 'BACK' : 'FRONT'}`);

        if (isFlipped) {
            await this.renderBack(cardData, options);
        } else {
            await this.renderFront(cardData, options);
        }
    }

    // ===== BACK SIDE =====
    async renderBack(cardData, options) {
        console.log("CardRenderer: renderBack called", options);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Ensure template is loaded
        await this.templateReady;

        // Draw Template
        if (this.templateLoaded) {
            const bgScale = options.backgroundScale || 1.0;
            const bgWidth = this.canvas.width * bgScale;
            const bgHeight = this.canvas.height * bgScale;
            const bgX = (this.canvas.width - bgWidth) / 2;
            const bgY = (this.canvas.height - bgHeight) / 2;
            this.ctx.drawImage(this.template, bgX, bgY, bgWidth, bgHeight);
        } else {
            this.ctx.fillStyle = '#e0cda8';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        const ctx = this.ctx;
        const width = this.canvas.width;
        const fontFamily = options.fontFamily || 'Heebo';
        const sizes = options.fontSizes || { abilityNameSize: 36, mechSize: 24, loreSize: 20 };
        const offsets = options;
        const styles = options.fontStyles || {};

        // Helper to construct font string
        const getFont = (prefix, size) => {
            const bold = styles[`${prefix}Bold`] ? 'bold ' : '';
            const italic = styles[`${prefix}Italic`] ? 'italic ' : '';
            return `${italic}${bold}${size}px "${fontFamily}"`;
        };

        ctx.textAlign = 'center';

        // Ability Name (Title)
        ctx.font = getFont('abilityName', sizes.abilityNameSize);
        ctx.fillStyle = '#2c1810';
        const abilityY = offsets.abilityName || 120;

        // Render Glow for Title if enabled
        if (styles.abilityNameGlow) {
            ctx.save();
            ctx.shadowColor = '#e2c47f'; // Softer, parchment-gold
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = '#e2c47f';
            ctx.fillText(cardData.abilityName || '', width / 2, abilityY);
            ctx.fillText(cardData.abilityName || '', width / 2, abilityY);
            ctx.restore();
        }
        ctx.fillText(cardData.abilityName || '', width / 2, abilityY);

        // Divider Line
        ctx.beginPath();
        ctx.moveTo(100, abilityY + 20);
        ctx.lineTo(width - 100, abilityY + 20);
        ctx.strokeStyle = '#4a0e0e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Mechanics (Main Body)
        ctx.font = getFont('mech', sizes.mechSize);
        ctx.fillStyle = '#1a1a1a';
        let currentY = offsets.mech || 180;
        const mechWidth = offsets.mechWidth || 600;

        if (cardData.abilityDesc) {
            currentY = this.wrapTextCentered(
                cardData.abilityDesc,
                width / 2,
                currentY,
                mechWidth,
                sizes.mechSize * 1.4,
                { glow: styles.mechGlow }
            );
        }

        // Lore (Bottom)
        if (cardData.description) {
            const loreY = Math.max(currentY + 40, offsets.lore || 600);
            ctx.font = getFont('lore', sizes.loreSize);
            ctx.fillStyle = '#5a4a3a';
            const loreWidth = offsets.loreWidth || 550;
            this.wrapTextCentered(
                cardData.description,
                width / 2,
                loreY,
                loreWidth,
                sizes.loreSize * 1.3,
                { glow: styles.loreGlow }
            );
        }
    }

    async renderFront(cardData, options = {}) {

        // DEBUG: Check if canvas is visible in DOM
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            console.error("CardRenderer: Canvas has 0 dimensions on screen!", rect);
        }

        const imageYOffset = parseInt(options.imageYOffset) || 0;

        // Granular offsets (FRONT SIDE ONLY)
        const nameOffset = parseInt(options.name) || 0;
        const typeOffset = parseInt(options.type) || 0;
        const rarityOffset = parseInt(options.rarity) || 0;
        const goldOffset = parseInt(options.gold) || 0;
        const coreStatsOffset = parseInt(options.coreStats) || 680; // Damage/AC position
        const statsOffset = parseInt(options.stats) || 780; // Quick stats position

        // Font settings
        const fontFamily = options.fontFamily || 'Heebo';

        const offsets = {
            image: imageYOffset,
            name: nameOffset,
            type: typeOffset,
            rarity: rarityOffset,
            gold: goldOffset,
            coreStats: coreStatsOffset,
            stats: statsOffset,
            fontFamily: fontFamily,
            fontSizes: options.fontSizes,
            fontStyles: options.fontStyles,
            // Widths
            nameWidth: Number(options.nameWidth) || 500,
            typeWidth: Number(options.typeWidth) || 500,
            rarityWidth: Number(options.rarityWidth) || 500,
            coreStatsWidth: Number(options.coreStatsWidth) || 500,
            statsWidth: Number(options.statsWidth) || 500,
            goldWidth: Number(options.goldWidth) || 500,

            // Text Effects (Passed to drawText)
            textOutlineEnabled: options.textOutlineEnabled,
            textOutlineWidth: options.textOutlineWidth,
            textShadowEnabled: options.textShadowEnabled,
            textShadowBlur: options.textShadowBlur,
            textBackdropEnabled: options.textBackdropEnabled,
            textBackdropOpacity: options.textBackdropOpacity
        };

        // Ensure template is loaded
        await this.templateReady;
        if (!this.templateLoaded) {
            console.error("CardRenderer: Template failed to load, cannot render");
            alert("Card Template failed to load. Please refresh or check connection. \nURL: " + cardTemplateUrl);
            return;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Template
        console.log("CardRenderer: Drawing template");
        const bgScale = options.backgroundScale || 1.0;
        const bgWidth = this.canvas.width * bgScale;
        const bgHeight = this.canvas.height * bgScale;
        const bgX = (this.canvas.width - bgWidth) / 2;
        const bgY = (this.canvas.height - bgHeight) / 2;

        // DEBUG: Verify BG dimensions
        console.log(`CardRenderer: bg dim: ${bgWidth}x${bgHeight} at ${bgX},${bgY}. Template nat: ${this.template.naturalWidth}x${this.template.naturalHeight}`);

        // Safety: If template seems broken (0 width), draw fallback
        if (this.template.naturalWidth === 0) {
            console.warn("CardRenderer: Template width is 0, using fallback color");
            this.ctx.fillStyle = '#e0cda8'; // Parchment color
            this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        } else {
            this.ctx.drawImage(this.template, bgX, bgY, bgWidth, bgHeight);

            // Double check: Did it draw anything? 
            try {
                const centerX = Math.floor(this.canvas.width / 2);
                const centerY = Math.floor(this.canvas.height / 2);
                const pixel = this.ctx.getImageData(centerX, centerY, 1, 1).data;
                // If pixel is fully transparent (alpha 0), and we expected a solid background...
                if (pixel[3] === 0) {
                    console.warn("CardRenderer: Center pixel is transparent after drawing template! Drawing fallback.");
                    // Draw fallback BEHIND the potentially transparent template
                    this.ctx.save();
                    this.ctx.globalCompositeOperation = 'destination-over';
                    this.ctx.fillStyle = '#e0cda8';
                    this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
                    this.ctx.restore();
                }
            } catch (e) {
                console.warn("CardRenderer: Could not verify template pixels (CORS?). Assuming success or ignoring.", e);
            }
        }

        // 2. Draw Item Image
        if (cardData.imageUrl) {
            console.log("CardRenderer: Drawing item image", cardData.imageUrl);
            try {
                await this.drawItemImage(
                    cardData.imageUrl,
                    offsets.image,
                    options.imageScale,
                    options.imageRotation,
                    options.imageStyle,
                    options.imageColor,
                    options.imageFade,
                    options.imageShadow
                );
            } catch (e) {
                console.error("CardRenderer: Failed to draw image, continuing...", e);
            }
        } else {
            console.log("CardRenderer: No image URL provided");
        }

        // 3. Draw Text
        console.log("CardRenderer: Drawing text");
        try {
            this.drawText(cardData, offsets);
        } catch (e) {
            console.error("CardRenderer: Failed to draw text", e);
        }



        console.log("CardRenderer: Render complete");
    }

    async drawItemImage(url, yOffset = 0, scale = 1.0, rotation = 0, style = 'natural', color = '#ffffff', fade = 0, shadow = 0) {
        let img;

        // 1. Check Cache
        if (this.lastImageUrl === url && this.lastImage && this.lastImage.complete && this.lastImage.naturalWidth > 0) {
            // Cache Hit
            img = this.lastImage;
        } else {
            // Cache Miss - Load New
            img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = url;
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error(`Image load timed out: ${url}`)), 10000);
                    if (img.complete) { clearTimeout(timeout); resolve(); }
                    img.onload = () => { clearTimeout(timeout); resolve(); };
                    img.onerror = () => { clearTimeout(timeout); reject(new Error(`Failed to load image: ${url}`)); };
                });

                // Update Cache
                this.lastImageUrl = url;
                this.lastImage = img;

            } catch (error) {
                console.warn('Image load error, skipping image:', error);
                return;
            }
        }

        const maxW = 350;
        const maxH = 300;
        const x = (this.canvas.width - maxW) / 2;
        const baseY = 230;
        const y = baseY + yOffset;
        const centerX = x + maxW / 2;
        const centerY = y + maxH / 2;

        const fitScale = Math.min(maxW / img.width, maxH / img.height);
        const finalScale = fitScale * scale;
        const w = img.width * finalScale;
        const h = img.height * finalScale;

        // Use a temporary canvas to apply masks/fade without affecting the main canvas
        const tempCanvas = document.createElement('canvas');
        // Make temp canvas large enough to hold rotated image
        const diag = Math.sqrt(w * w + h * h);
        tempCanvas.width = diag * 1.5;
        tempCanvas.height = diag * 1.5;
        const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        const tCx = tempCanvas.width / 2;
        const tCy = tempCanvas.height / 2;

        tCtx.save();
        tCtx.translate(tCx, tCy);
        tCtx.rotate(rotation * Math.PI / 180);

        // 1. Prepare Source (Remove BG if needed)
        let drawSource = img;
        if (style === 'no-background') {
            drawSource = this.removeWhiteBackground(img);
        }

        // 2. Draw Image on Temp Canvas
        if (style === 'round-frame') {
            tCtx.beginPath();
            tCtx.arc(0, 0, Math.min(w, h) / 2, 0, Math.PI * 2);
            tCtx.clip();
        } else if (style === 'square-frame') {
            tCtx.beginPath();
            tCtx.rect(-w / 2, -h / 2, w, h);
            tCtx.clip();
        }

        tCtx.drawImage(drawSource, -w / 2, -h / 2, w, h);

        // Draw Border for frames
        if (style === 'round-frame' || style === 'square-frame') {
            tCtx.strokeStyle = '#000000';
            tCtx.lineWidth = 2;
            tCtx.stroke();
        }

        tCtx.restore();

        // 3. Apply Fade (Vignette)
        if (fade > 0) {
            tCtx.save();
            tCtx.globalCompositeOperation = 'destination-in';

            const halfMin = Math.min(w, h) / 2;
            const diag = Math.sqrt(w * w + h * h) / 2;
            const fadeFactor = fade / 100; // 0 to 1

            const startOuter = diag * 1.5;
            const endOuter = halfMin * 0.7; // Tighter circle at max fade
            const outerRadius = startOuter - (startOuter - endOuter) * fadeFactor;

            const startInner = diag * 1.2;
            const endInner = halfMin * 0.3; // Don't go to 0, keep a small clear hole even at max
            const innerRadius = startInner - (startInner - endInner) * fadeFactor;

            const gradient = tCtx.createRadialGradient(tCx, tCy, Math.max(0, innerRadius), tCx, tCy, Math.max(0, outerRadius));
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Fully visible
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fully transparent

            tCtx.fillStyle = gradient;
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.restore();
        }

        // 4. Draw Temp Canvas onto Main Canvas with Shadow
        this.ctx.save();

        // Reset shadow first (crucial fix for persistence)
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';

        if (shadow > 0) {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'; // Darker
            this.ctx.shadowBlur = shadow * 0.6; // More blur
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = shadow * 0.25; // More vertical offset
        }

        // Draw the temp canvas centered on the target position
        this.ctx.drawImage(tempCanvas, centerX - tCx, centerY - tCy);

        this.ctx.restore();
    }


    removeWhiteBackground(img) {
        console.log("CardRenderer: removeWhiteBackground called");
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            console.error("CardRenderer: Failed to get image data (CORS issue?)", e);
            return canvas;
        }

        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        console.log(`CardRenderer: Processing image ${width}x${height}`);

        // --- STRATEGY 1: FLOOD FILL (Magic Wand) ---
        // Scan ALL border pixels for starting points, not just corners
        const queue = [];
        const visited = new Uint8Array(width * height);

        const getIdx = (x, y) => (y * width + x) * 4;

        // Helper: Is this pixel "white enough" to start removing?
        const isStartWhite = (idx) => {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            // Threshold: > 200 (light gray or white)
            return r > 200 && g > 200 && b > 200;
        };

        // Helper: Is this pixel close enough to be removed?
        const isCloseToWhite = (idx) => {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const threshold = 40;
            return r > (255 - threshold) && g > (255 - threshold) && b > (255 - threshold) &&
                Math.abs(r - g) < threshold && Math.abs(r - b) < threshold && Math.abs(g - b) < threshold;
        };

        // 1. Collect start points from borders
        for (let x = 0; x < width; x++) {
            // Top and Bottom rows
            [0, height - 1].forEach(y => {
                const idx = getIdx(x, y);
                if (isStartWhite(idx)) {
                    queue.push({ x, y });
                    visited[y * width + x] = 1;
                }
            });
        }
        for (let y = 0; y < height; y++) {
            // Left and Right columns
            [0, width - 1].forEach(x => {
                const idx = getIdx(x, y);
                if (!visited[y * width + x] && isStartWhite(idx)) {
                    queue.push({ x, y });
                    visited[y * width + x] = 1;
                }
            });
        }

        console.log(`CardRenderer: Found ${queue.length} starting border pixels`);

        let floodFilledPixels = 0;
        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const idx = getIdx(x, y);

            // Remove pixel
            data[idx + 3] = 0;
            floodFilledPixels++;

            const neighbors = [
                { x: x + 1, y: y }, { x: x - 1, y: y },
                { x: x, y: y + 1 }, { x: x, y: y - 1 }
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                    const vIdx = n.y * width + n.x;
                    if (!visited[vIdx]) {
                        const nIdx = getIdx(n.x, n.y);
                        if (isCloseToWhite(nIdx)) {
                            visited[vIdx] = 1;
                            queue.push(n);
                        }
                    }
                }
            }
        }
        console.log(`CardRenderer: Flood Fill removed ${floodFilledPixels} pixels`);

        // --- STRATEGY 2: FALLBACK (Simple Threshold) ---
        // If Flood Fill failed (e.g. removed < 1% of pixels), maybe the background isn't connected to borders?
        // Or maybe borders aren't white?
        // Let's run a simple "remove all white pixels" pass if Flood Fill did little work.

        if (floodFilledPixels < (width * height * 0.01)) {
            console.warn("CardRenderer: Flood Fill ineffective, running fallback threshold removal...");
            for (let i = 0; i < data.length; i += 4) {
                // Skip already transparent ones
                if (data[i + 3] === 0) continue;

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Simple threshold: > 230
                if (r > 230 && g > 230 && b > 230) {
                    data[i + 3] = 0;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    // ===== FRONT SIDE TEXT =====
    drawText(data, offsets) {
        console.log("CardRenderer: drawText (FRONT) called", { data, offsets });
        const ctx = this.ctx;
        const width = this.canvas.width;

        const defaultSizes = {
            nameSize: 48,
            typeSize: 24,
            raritySize: 24,
            statsSize: 28,
            goldSize: 24
        };
        const sizes = { ...defaultSizes, ...(offsets.fontSizes || {}) };

        // Helper to construct font string
        const getFont = (prefix, size) => {
            const styles = offsets.fontStyles || {};
            const bold = styles[`${prefix}Bold`] ? 'bold ' : '';
            const italic = styles[`${prefix}Italic`] ? 'italic ' : '';
            return `${italic}${bold}${size}px "${offsets.fontFamily}"`;
        };

        // Text effects configuration (global)
        const textEffects = {
            outlineEnabled: offsets.textOutlineEnabled || false,
            outlineWidth: offsets.textOutlineWidth || 2,
            shadowBlur: offsets.textShadowBlur || 4
        };

        // Get per-element styles
        const styles = offsets.fontStyles || {};

        // Helper: Draw text with optional outline and per-element shadow
        const drawStyledText = (text, x, y, maxWidth, elementName) => {
            if (!text) return;

            ctx.save();

            // Check per-element shadow (e.g., nameShadow, rarityShadow)
            const elementShadow = styles[`${elementName}Shadow`] || offsets.textShadowEnabled;
            // Check per-element glow
            const elementGlow = styles[`${elementName}Glow`];

            // 1. Draw Glow (Halo) - BEHIND everything
            if (elementGlow) {
                ctx.save();
                ctx.shadowColor = '#e2c47f'; // Softer, parchment-gold
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.fillStyle = '#e2c47f'; // Fill with same color to strengthen core
                // Draw multiple times for stronger effect
                ctx.fillText(text, x, y, maxWidth);
                ctx.fillText(text, x, y, maxWidth);
                ctx.restore();
            }

            // 2. Apply shadow if enabled for this element (and NOT Glow - usually mutually exclusive or stacked)
            // If Glow is on, we might skip shadow or draw it on top? 
            // Let's allow stacking: Glow is background, Shadow is drop-shadow.
            if (elementShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
                ctx.shadowBlur = textEffects.shadowBlur;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 2;
            }

            // 3. Draw outline first (behind fill but above glow)
            if (textEffects.outlineEnabled) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = textEffects.outlineWidth;
                ctx.lineJoin = 'round';
                ctx.strokeText(text, x, y, maxWidth);
            }

            // 4. Draw fill
            ctx.fillText(text, x, y, maxWidth);

            ctx.restore();
        };

        // ===== TEXT POSITIONS (Top to Bottom Order) =====
        // Safe area inside frame: approximately Y=100 to Y=900

        // 1. Rarity (TOP) - נדירות
        ctx.font = getFont('rarity', sizes.raritySize);
        ctx.fillStyle = '#2c1810';
        ctx.textAlign = 'center';
        const rarityY = 100 + offsets.rarity;
        drawStyledText(data.rarityHe || '', width / 2, rarityY, offsets.rarityWidth, 'rarity');

        // 2. Type (BELOW RARITY) - סוג הפריט
        ctx.font = getFont('type', sizes.typeSize);
        let typeText = `${data.typeHe || ''}`;
        const typeY = 140 + offsets.type;
        drawStyledText(typeText, width / 2, typeY, Number(offsets.typeWidth || 500), 'type');

        // 3. Name (BELOW TYPE) - שם הפריט
        ctx.font = getFont('name', sizes.nameSize);
        ctx.fillStyle = '#2c1810';
        const nameY = 200 + offsets.name;
        drawStyledText(data.name, width / 2, nameY, Number(offsets.nameWidth || 500), 'name');

        // --- QUICK STATS SECTION ---

        // Helper function to translate damage types based on locale
        const translateDamageTypes = (text) => {
            if (!text) return text;

            const locale = window.i18n?.getLocale() || 'he';
            const isHebrew = locale === 'he';

            const damageTypes = {
                "slashing": "חותך", "piercing": "דוקר", "bludgeoning": "מוחץ",
                "fire": "אש", "cold": "קור", "lightning": "ברק", "poison": "רעל",
                "acid": "חומצה", "necrotic": "נמק", "radiant": "זוהר", "force": "כוח",
                "psychic": "נפשי", "thunder": "רעם"
            };

            let result = text;

            if (isHebrew) {
                // Translate English to Hebrew
                for (const [eng, heb] of Object.entries(damageTypes)) {
                    result = result.replace(new RegExp(eng, 'gi'), heb);
                }
                // Remove duplicate Hebrew damage types
                for (const heb of Object.values(damageTypes)) {
                    result = result.replace(new RegExp(`${heb}\\s+${heb}`, 'g'), heb);
                }
            } else {
                // Translate Hebrew to English
                for (const [eng, heb] of Object.entries(damageTypes)) {
                    result = result.replace(new RegExp(heb, 'g'), eng);
                }
                // Remove duplicate English damage types
                for (const eng of Object.keys(damageTypes)) {
                    result = result.replace(new RegExp(`${eng}\\s+${eng}`, 'gi'), eng);
                }
            }

            return result.replace(/\s{2,}/g, ' ').trim();
        };

        // 1. Core Stats Header (Damage / AC)
        let coreStatsText = "";
        if (data.weaponDamage && data.weaponDamage !== 'null' && data.weaponDamage !== null) {
            // RTL reading order (right to left): base damage → versatile → damage type
            // String order: baseDamage → versatile → damageType
            const LTR = '\u200E';
            const baseDamage = `${LTR}${data.weaponDamage}`;
            const damageType = data.damageType || '';


            if (data.versatileDamage) {
                // Use RLM (Right-to-Left Mark) to force Hebrew reading order
                // Display should be: baseDamage (right) → versatile (middle) → damageType (left)
                const RLM = '\u200F';
                coreStatsText = `${RLM}${baseDamage} (🤲${data.versatileDamage}) ${damageType}${RLM}`;
            } else {
                const RLM = '\u200F';
                coreStatsText = `${RLM}${baseDamage} ${damageType}${RLM}`;
            }

            // Add weapon properties if available (excluding רב-שימושי since we show it with emoji)
            if (data.weaponProperties && data.weaponProperties.length > 0) {
                const propsWithoutVersatile = data.weaponProperties.filter(p => p !== 'רב-שימושי');
                if (propsWithoutVersatile.length > 0) {
                    coreStatsText += ` (${propsWithoutVersatile.join(', ')})`;
                }
            }
        }
        if (data.armorClass && data.armorClass !== 'null' && data.armorClass !== null) {
            const locale = window.i18n?.getLocale() || 'he';
            const acLabel = locale === 'he' ? 'דרג"ש' : 'AC';
            coreStatsText = `${data.armorClass} ${acLabel}`;
        }

        // Clean up any English damage types and remove 'null' text
        coreStatsText = translateDamageTypes(coreStatsText);
        coreStatsText = coreStatsText.replace(/null/gi, '').trim();

        // ===== TEXT BACKDROP (Semi-transparent band for readability) =====
        console.log('CardRenderer: Backdrop check:', {
            enabled: offsets.textBackdropEnabled,
            opacity: offsets.textBackdropOpacity
        });

        if (offsets.textBackdropEnabled) {
            console.log('CardRenderer: Drawing backdrop...');
            ctx.save();
            const backdropOpacity = (offsets.textBackdropOpacity || 40) / 100;
            const backdropY = (offsets.coreStats || 680) - 50; // Start above coreStats
            const backdropHeight = this.canvas.height - backdropY; // Extend to bottom

            console.log('CardRenderer: Backdrop params:', { backdropOpacity, backdropY, backdropHeight, canvasHeight: this.canvas.height });

            ctx.fillStyle = `rgba(0, 0, 0, ${backdropOpacity})`;
            ctx.fillRect(0, backdropY, width, backdropHeight);
            ctx.restore();
        }

        if (coreStatsText) {
            // Use dedicated size/offset if available, else fallback
            const coreSize = sizes.coreStatsSize || (sizes.statsSize * 1.3);
            const coreY = offsets.coreStats || (offsets.stats ? offsets.stats - 80 : 700);

            ctx.font = getFont('coreStats', coreSize);
            ctx.fillStyle = '#1a1a1a';
            const coreStatsWidth = Number(offsets.coreStatsWidth || 500);

            // Draw text with optional effects
            drawStyledText(coreStatsText, width / 2, coreY, coreStatsWidth, 'coreStats');
        }

        // 2. Quick Description (The AI generated text)
        let statsText = data.quickStats;

        // Filter out damage dice patterns (e.g., "1d8", "2d6+3") since they're already shown in core stats
        if (statsText) {
            const locale = window.i18n?.getLocale() || 'he';
            // First translate damage types to match current locale
            statsText = translateDamageTypes(statsText);
            // Then remove dice patterns
            statsText = statsText.replace(/\d+d\d+(\s*[+\-]\s*\d+)?/gi, '').trim();
            // Also remove common damage type words that would be redundant (locale-aware)
            if (locale === 'he') {
                statsText = statsText.replace(/(מוחץ|דוקר|חותך|נזק)/gi, '').trim();
            } else {
                statsText = statsText.replace(/(bludgeoning|piercing|slashing|damage)/gi, '').trim();
            }
            // Clean up any double spaces (but preserve newlines!)
            statsText = statsText.replace(/[^\S\n]{2,}/g, ' ');
        }

        if (statsText) {
            ctx.font = getFont('stats', sizes.statsSize);
            ctx.fillStyle = '#1a1a1a';
            const statsY = offsets.stats || 800;
            const lineHeight = sizes.statsSize * 1.2; // Line spacing

            // Split by newlines to support multiline text
            const lines = statsText.split('\n');
            lines.forEach((line, index) => {
                if (line.trim()) {
                    drawStyledText(line.trim(), width / 2, statsY + (index * lineHeight), Number(offsets.statsWidth || 500), 'stats');
                }
            });
        }

        // Footer - Gold value
        const goldValue = data.gold || '-';
        const goldStyles = offsets.fontStyles || {};
        const goldBold = goldStyles.goldBold ? 'bold ' : '';
        const goldItalic = goldStyles.goldItalic ? 'italic ' : '';
        ctx.font = `${goldItalic}${goldBold}${sizes.goldSize}px Cinzel`;

        const metrics = ctx.measureText(goldValue);
        const iconSize = sizes.goldSize * 1.5;
        const spacing = 10;
        const totalW = metrics.width + iconSize + spacing;
        const startX = (width - totalW) / 2;
        const textX = startX + iconSize + spacing + (metrics.width / 2);

        const goldY = 920 + offsets.gold;

        // Draw Icon
        this.drawGoldIcon(ctx, startX + iconSize / 2, goldY - (sizes.goldSize * 0.4), iconSize);

        // Draw Dark Halo if enabled
        if (goldStyles.goldGlow) {
            ctx.save();
            ctx.shadowColor = '#000000'; // Dark halo as requested
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = '#000000';
            ctx.fillText(goldValue, textX, goldY);
            ctx.fillText(goldValue, textX, goldY);
            ctx.restore();
        }

        // Draw Text with Stroke
        ctx.fillStyle = '#d4af37';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(goldValue, textX, goldY);
        ctx.fillText(goldValue, textX, goldY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'transparent';
    }

    drawGoldIcon(ctx, x, y, size) {
        ctx.save();
        const r = size / 2;

        // 1. Outer Ring
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        grad.addColorStop(0, '#f9d976');
        grad.addColorStop(1, '#b06604'); // Dark gold
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#5a3a00';
        ctx.stroke();

        // 2. Inner Circle (Inset)
        ctx.beginPath();
        ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbecc2'; // Highlight ring
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3. Center Symbol (Removed for generic fantasy coin)
        // ctx.fillStyle = '#6e4303';
        // ctx.font = `bold ${size * 0.5}px Arial`;
        // ctx.textAlign = 'center';
        // ctx.textBaseline = 'middle';
        // ctx.fillText('₪', x, y + 1); 

        // 4. Shiny Highlight
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();

        ctx.restore();
    }

    wrapTextCentered(text, x, y, maxWidth, lineHeight, options = {}) {
        const ctx = this.ctx;

        // Split by newlines first to respect manual line breaks
        const paragraphs = text.split('\n');

        let currentY = y;

        paragraphs.forEach(paragraph => {
            const words = paragraph.split(' ');
            let line = '';

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;

                if (testWidth > maxWidth && n > 0) {
                    if (options.glow) {
                        ctx.save();
                        ctx.shadowColor = '#e2c47f'; // Softer, parchment-gold
                        ctx.shadowBlur = 15;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                        ctx.fillStyle = '#e2c47f';
                        ctx.fillText(line, x, currentY);
                        ctx.fillText(line, x, currentY);
                        ctx.restore();
                    }
                    ctx.fillText(line, x, currentY);
                    line = words[n] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            if (options.glow) {
                ctx.save();
                ctx.shadowColor = '#e2c47f'; // Softer, parchment-gold
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.fillStyle = '#e2c47f';
                ctx.fillText(line, x, currentY);
                ctx.fillText(line, x, currentY);
                ctx.restore();
            }
            ctx.fillText(line, x, currentY);
            currentY += lineHeight;
        });

        return currentY;
    }

    wrapText(text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                this.ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            }
            else {
                line = testLine;
            }
        }
        this.ctx.fillText(line, x, y);
    }
    async downloadCard(filename = 'card') {
        try {
            console.log(`CardRenderer: Starting save process for "${filename}"`);

            // Ensure filename ends with .jpg
            let finalName = filename.replace(/\.(png|jpg|jpeg)$/i, '');
            finalName = `${finalName}.jpg`;

            // 1. Modern Method: window.showSaveFilePicker (Allows user to choose folder)
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: finalName,
                        types: [{
                            description: 'JPG Image',
                            accept: { 'image/jpeg': ['.jpg'] },
                        }],
                    });

                    const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/jpeg', 0.9));
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    console.log(`Card saved via FilePicker: ${finalName}`);
                    return; // Success, exit
                } catch (err) {
                    if (err.name === 'AbortError') {
                        console.log('User cancelled save dialog');
                        return;
                    }
                    console.warn('FilePicker failed, trying fallback:', err);
                    // Fallthrough to fallback
                }
            }

            // 2. Fallback Method: Classic <a> tag with Blob (Better for special chars than DataURL)
            const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/jpeg', 0.9));
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.download = finalName;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 100);
            console.log(`Card downloaded via fallback: ${finalName}`);

        } catch (e) {
            console.error("Download/Save failed:", e);
            alert("שגיאה בשמירת הקובץ: " + e.message);
        }
    }
}

export default CardRenderer;
