// Detect base path for GitHub Pages or local development
const getBasePath = () => {
    const path = window.location.pathname;
    // If running on GitHub Pages (path contains /dnd-card-maker/)
    if (path.includes('/dnd-card-maker/')) {
        return '/dnd-card-maker/';
    }
    // Local development
    return '/';
};
const BASE_PATH = getBasePath();

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
        });
    }

    async _loadTemplate() {
        const primaryPath = BASE_PATH + 'assets/card-template.png';
        const fallbackPath = BASE_PATH + 'public/assets/card-template.png';

        console.log("CardRenderer: Attempting to load template from:", primaryPath);

        try {
            await this._loadImage(this.template, primaryPath);
            console.log("CardRenderer: Template loaded successfully from primary path");
            this.templateLoaded = true;
        } catch (e) {
            console.log("CardRenderer: Failed to load from primary path, trying fallback...");
            try {
                await this._loadImage(this.template, fallbackPath);
                console.log("CardRenderer: Template loaded successfully from fallback path");
                this.templateLoaded = true;
            } catch (e2) {
                console.error("CardRenderer: Failed to load template from both paths!", e2);
                this.templateLoaded = false;
            }
        }
    }

    _loadImage(img, src) {
        return new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => reject(e);
            img.src = src;
        });
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
            fontSizes: options.fontSizes
        };

        // Ensure template is loaded
        await this.templateReady;
        if (!this.templateLoaded) {
            console.error("CardRenderer: Template failed to load, cannot render");
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

        this.ctx.drawImage(this.template, bgX, bgY, bgWidth, bgHeight);

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
        const ctx = this.ctx;
        const width = this.canvas.width;
        const maxWidth = 500; // Approximate width for text wrapping

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

        // Name
        ctx.font = `bold ${sizes.nameSize}px "${offsets.fontFamily}"`;
        ctx.fillStyle = '#2c1810';
        ctx.textAlign = 'center';
        ctx.fillText(data.name, width / 2, 160 + offsets.name);

        // Type
        ctx.font = `${sizes.typeSize}px "${offsets.fontFamily}"`;
        let typeText = `${data.typeHe}`;
        if (data.weaponDamage) typeText += ` • ${data.weaponDamage} ${data.damageType || ''}`;
        if (data.armorClass) typeText += ` • AC ${data.armorClass}`;
        ctx.fillText(typeText, width / 2, 105 + offsets.type);

        // Rarity
        ctx.font = `${sizes.raritySize}px "${offsets.fontFamily}"`;
        // Default rarityY is 135, plus slider offset
        const rarityY = 135 + offsets.rarity;
        ctx.fillText(data.rarityHe, width / 2, rarityY);

        // Description Block
        let currentY = offsets.abilityY; // Use passed offset

        // Ability Name
        if (data.abilityName) {
            ctx.font = `bold ${sizes.abilityNameSize}px "${offsets.fontFamily}"`;
            ctx.fillText(`${data.abilityName}:`, width / 2, currentY);
            currentY += sizes.abilityNameSize * 1.2;
        }

        // Ability Description
        if (data.abilityDesc) {
            ctx.font = `${sizes.abilityDescSize}px "${offsets.fontFamily}"`;
            currentY = this.wrapTextCentered(data.abilityDesc, width / 2, currentY, maxWidth, sizes.abilityDescSize * 1.2);
        }

        // Add Fluff Padding
        currentY += offsets.fluffPadding;

        // Fluff Description
        if (data.description) {
            ctx.font = `italic ${sizes.descSize}px "${offsets.fontFamily}"`;
            ctx.fillStyle = '#5a4a3a';
            this.wrapTextCentered(data.description, width / 2, currentY, maxWidth, sizes.descSize * 1.2);
        }

        // Footer - Gold value
        const goldValue = data.gold || '400';
        ctx.font = `bold ${sizes.goldSize}px Cinzel`;
        ctx.fillStyle = '#d4af37';
        ctx.fillText(goldValue, width / 2, 780 + offsets.gold);
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
