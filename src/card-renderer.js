
export class CardRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }
        this.ctx = this.canvas.getContext('2d');
        this.template = new Image();
        this.template.src = 'public/assets/card-template.png';
        this.fontsLoaded = false;

        // Wait for fonts
        document.fonts.ready.then(() => {
            this.fontsLoaded = true;
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
        if (!this.template.complete) {
            console.log("CardRenderer: Waiting for template...");
            await new Promise(resolve => {
                this.template.onload = resolve;
            });
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Template
        console.log("CardRenderer: Drawing template");
        this.ctx.drawImage(this.template, 0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw Item Image
        if (cardData.imageUrl) {
            console.log("CardRenderer: Drawing item image", cardData.imageUrl);
            try {
                await this.drawItemImage(cardData.imageUrl, offsets.image);
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

    async drawItemImage(url, yOffset = 0) {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Fix CORS for getImageData
        img.src = url;
        try {
            await new Promise((resolve, reject) => {
                // Timeout for image loading (10 seconds)
                const timeout = setTimeout(() => {
                    reject(new Error(`Image load timed out: ${url}`));
                }, 10000);

                if (img.complete) {
                    clearTimeout(timeout);
                    resolve();
                }
                img.onload = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                img.onerror = () => {
                    clearTimeout(timeout);
                    console.error('Failed to load image:', url);
                    reject(new Error(`Failed to load image: ${url}`));
                };
            });
        } catch (error) {
            console.warn('Image load error, skipping image:', error);
            return; // Skip drawing if image fails
        }

        // Define image area (approximate based on template)
        // Center x: 300, Center y: 400
        const maxW = 350;
        const maxH = 300;
        const x = (this.canvas.width - maxW) / 2;
        const baseY = 230;
        const y = baseY + yOffset;

        // Draw image with aspect ratio preserved, centered
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const offsetX = (maxW - w) / 2;
        const offsetY = (maxH - h) / 2;

        this.ctx.save();
        try {
            // Create a temporary canvas for feathering
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw image to temp canvas
            tempCtx.drawImage(img, 0, 0, w, h);

            // Get pixel data
            const imageData = tempCtx.getImageData(0, 0, w, h);
            const data = imageData.data;

            const centerX = w / 2;
            const centerY = h / 2;
            const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

            // Feathering strength (0.8 means inner 80% is opaque, outer 20% fades)
            const featherStart = 0.7;

            for (let i = 0; i < data.length; i += 4) {
                // Pixel coordinates
                const px = (i / 4) % w;
                const py = Math.floor((i / 4) / w);

                // Distance from center (normalized 0 to 1)
                const dist = Math.sqrt(Math.pow(px - centerX, 2) + Math.pow(py - centerY, 2));
                const normDist = dist / (Math.min(w, h) / 2); // Normalize to nearest edge

                if (normDist > featherStart) {
                    // Calculate fade
                    // Map range [featherStart, 1] to [1, 0]
                    let alpha = 1 - ((normDist - featherStart) / (1 - featherStart));
                    if (alpha < 0) alpha = 0;

                    // Apply to existing alpha
                    data[i + 3] = Math.floor(data[i + 3] * alpha);
                }
            }

            tempCtx.putImageData(imageData, 0, 0);

            // Draw feathered image to main canvas
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = 20;
            this.ctx.drawImage(tempCanvas, x + offsetX, y + offsetY, w, h);
        } catch (e) {
            console.error("CardRenderer: Error during image drawing", e);
        } finally {
            this.ctx.restore();
        }
    }

    drawText(data, offsets) {
        console.log("CardRenderer: drawText called", { data, offsets });
        const ctx = this.ctx;
        const width = this.canvas.width;
        const maxWidth = 500; // Approximate width for text wrapping

        const defaultSizes = {
            nameSize: 60,
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
}
