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
        this.ctx = this.canvas.getContext('2d');
        this.template = new Image();
        this.templateLoaded = false;
        this.fontsLoaded = false;

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
                console.log("CardRenderer: New template loaded");
                resolve();
            };
            this.template.onerror = (e) => {
                console.error("CardRenderer: Failed to load new template", e);
                reject(e);
            };
        });
    }

    async render(cardData, options = {}) {
        console.log("CardRenderer: render called", { cardData, options });

        // DEBUG: Check if canvas is visible in DOM
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            console.error("CardRenderer: Canvas has 0 dimensions on screen!", rect);
            // Don't alert here to avoid spam loop, but good to know
        }

        const imageYOffset = parseInt(options.imageYOffset) || 0;

        // Granular offsets
        const nameOffset = parseInt(options.name) || 0;
        const typeOffset = parseInt(options.type) || 0;
        const rarityOffset = parseInt(options.rarity) || 0;
        const goldOffset = parseInt(options.gold) || 0;
        const abilityY = parseInt(options.abilityY) || 530;
        const fluffPadding = parseInt(options.fluffPadding) || 20;

        // Font settings
        const fontSize = parseInt(options.fontSize) || 16;
        const fontFamily = options.fontFamily || 'Heebo';

        const offsets = {
            image: imageYOffset,
            name: nameOffset,
            type: typeOffset,
            rarity: rarityOffset,
            gold: goldOffset,
            abilityY: abilityY,
            fluffPadding: fluffPadding,
            fontSize: fontSize,
            fontFamily: fontFamily,
            fontSizes: options.fontSizes,
            fontStyles: options.fontStyles,
            // Widths
            nameWidth: Number(options.nameWidth) || 500,
            typeWidth: Number(options.typeWidth) || 500,
            rarityWidth: Number(options.rarityWidth) || 500,
            abilityWidth: Number(options.abilityWidth) || 500,
            fluffWidth: Number(options.fluffWidth) || 500,
            goldWidth: Number(options.goldWidth) || 500
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
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error(`Image load timed out: ${url}`)), 10000);
                if (img.complete) { clearTimeout(timeout); resolve(); }
                img.onload = () => { clearTimeout(timeout); resolve(); };
                img.onerror = () => { clearTimeout(timeout); reject(new Error(`Failed to load image: ${url}`)); };
            });
        } catch (error) {
            console.warn('Image load error, skipping image:', error);
            return;
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
        const tCtx = tempCanvas.getContext('2d');
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
            // Create radial gradient for vignette
            // The gradient should be opaque in center and transparent at edges
            // Fade value 0-100 controls how tight the vignette is

            const halfMin = Math.min(w, h) / 2;
            const diag = Math.sqrt(w * w + h * h) / 2;
            const fadeFactor = fade / 100; // 0 to 1

            // At max fade, outer radius should be inside the smallest edge to ensure transparency at borders
            // Adjusted: Pull in further (0.85) for "stronger" cropping
            const targetOuter = halfMin * 0.85;
            const startOuter = diag * 1.1; // Start slightly larger than corners

            const outerRadius = startOuter - (startOuter - targetOuter) * fadeFactor;

            // Inner radius shrinks as fade increases
            // Adjusted: Factor 0.5 (was 0.8) makes the transition zone NARROWER (less spread), creating a "focused" fade.
            const innerRadius = outerRadius * (1 - fadeFactor * 0.5);

            const gradient = tCtx.createRadialGradient(tCx, tCy, Math.max(0, innerRadius), tCx, tCy, outerRadius);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Fully visible
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fully transparent

            tCtx.fillStyle = gradient;
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.restore();

        }

        // 4. Draw Temp Canvas onto Main Canvas with Shadow
        this.ctx.save();

        if (shadow > 0) {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = shadow * 0.5; // Scale shadow blur
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = shadow * 0.2;
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
        const ctx = canvas.getContext('2d');
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

    drawText(data, offsets) {
        console.log("CardRenderer: drawText called", { data, offsets });
        console.log(`DEBUG: Widths - Name: ${offsets.nameWidth}, Ability: ${offsets.abilityWidth}, Fluff: ${offsets.fluffWidth}`);
        const ctx = this.ctx;
        const width = this.canvas.width;
        // const maxWidth = 500; // REMOVED: Now using per-element width

        const defaultSizes = {
            nameSize: 48,
            typeSize: 24,
            raritySize: 24,
            abilityNameSize: 28,
            abilityDescSize: 24,
            descSize: 22,
            goldSize: 24
        };
        const sizes = { ...defaultSizes, ...(offsets.fontSizes || {}) };

        // Helper to construct font string
        const getFont = (prefix, size) => {
            const styles = offsets.fontStyles || {};
            const bold = styles[`${prefix}Bold`] ? 'bold ' : '';
            const italic = styles[`${prefix}Italic`] ? 'italic ' : '';
            // If neither, result is empty string, which is valid (defaults to normal)
            return `${italic}${bold}${size}px "${offsets.fontFamily}"`;
        };

        // Name
        ctx.font = getFont('name', sizes.nameSize);
        ctx.fillStyle = '#2c1810';
        ctx.textAlign = 'center';
        ctx.fillText(data.name, width / 2, 160 + offsets.name, Number(offsets.nameWidth || 500));

        // Type
        ctx.font = getFont('type', sizes.typeSize);
        let typeText = `${data.typeHe}`;
        if (data.weaponDamage) typeText += ` • ${data.weaponDamage} ${data.damageType || ''}`;
        if (data.armorClass) typeText += ` • AC ${data.armorClass}`;
        ctx.fillText(typeText, width / 2, 105 + offsets.type, Number(offsets.typeWidth || 500));

        // Rarity
        ctx.font = getFont('rarity', sizes.raritySize);
        // Default rarityY is 135, plus slider offset
        const rarityY = 135 + offsets.rarity;
        ctx.fillText(data.rarityHe, width / 2, rarityY, offsets.rarityWidth);

        // Description Block
        let currentY = offsets.abilityY; // Use passed offset

        // Ability Name
        if (data.abilityName) {
            ctx.font = getFont('abilityName', sizes.abilityNameSize);
            ctx.fillText(`${data.abilityName}:`, width / 2, currentY, Number(offsets.abilityWidth || 500));
            currentY += sizes.abilityNameSize * 1.2;
        }

        // Ability Description
        if (data.abilityDesc) {
            ctx.font = getFont('abilityDesc', sizes.abilityDescSize);
            currentY = this.wrapTextCentered(data.abilityDesc, width / 2, currentY, Number(offsets.abilityWidth || 500), sizes.abilityDescSize * 1.2);
        }

        // Add Fluff Padding
        currentY += Number(offsets.fluffPadding || 0);

        // Fluff Description
        if (data.description) {
            ctx.font = getFont('desc', sizes.descSize);
            ctx.fillStyle = '#5a4a3a';
            this.wrapTextCentered(data.description, width / 2, currentY, Number(offsets.fluffWidth || 500), sizes.descSize * 1.2);
        }

        // Footer - Gold value (Gold Coin Icon & Stroke)
        const goldValue = data.gold || '400';
        const goldStyles = offsets.fontStyles || {};
        const goldBold = goldStyles.goldBold ? 'bold ' : '';
        const goldItalic = goldStyles.goldItalic ? 'italic ' : '';
        ctx.font = `${goldItalic}${goldBold}${sizes.goldSize}px Cinzel`; // Cinzel is better for numbers

        // Measure text for centering
        const metrics = ctx.measureText(goldValue);
        const iconSize = sizes.goldSize * 1.5; // Icon larger than text
        const spacing = 10;
        const totalW = metrics.width + iconSize + spacing;

        // Center Group
        const startX = (width - totalW) / 2;
        const textX = startX + iconSize + spacing + (metrics.width / 2); // Text is usually center aligned in drawText

        const goldY = 780 + offsets.gold;

        // Draw Icon
        this.drawGoldIcon(ctx, startX + iconSize / 2, goldY - (sizes.goldSize * 0.4), iconSize);

        // Draw Text with Stroke
        ctx.fillStyle = '#d4af37';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(goldValue, textX, goldY);
        ctx.fillText(goldValue, textX, goldY);
        // Reset stroke styles
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

    wrapTextCentered(text, x, y, maxWidth, lineHeight) {
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
                    ctx.fillText(line, x, currentY);
                    line = words[n] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
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
