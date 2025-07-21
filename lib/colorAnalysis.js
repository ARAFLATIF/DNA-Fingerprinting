const Vibrant = require('node-vibrant');

/**
 * Helper function to convert RGB to HSL
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {number[]} HSL array [hue, saturation, lightness]
 */
function rgbToHsl(r, g, b) {
    // Normalize RGB values to 0-1 range
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l;

    // Calculate lightness
    l = (max + min) / 2;

    if (max === min) {
        // Achromatic (gray)
        h = s = 0;
    } else {
        const d = max - min;
        
        // Calculate saturation
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        // Calculate hue
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return [
        Math.round(h * 360),
        Math.round(s * 100),
        Math.round(l * 100)
    ];
}

/**
 * Helper function to determine hue relationship between two colors
 * @param {number} h1 - First hue (0-360)
 * @param {number} h2 - Second hue (0-360)
 * @returns {string} Relationship type: 'complementary', 'analogous', 'triadic', or 'none'
 */
function getHueRelationship(h1, h2) {
    // Calculate the difference between hues
    let diff = Math.abs(h1 - h2);
    
    // Handle wraparound (e.g., 10 degrees and 350 degrees are 20 degrees apart)
    if (diff > 180) {
        diff = 360 - diff;
    }

    // Define tolerance ranges
    const complementaryTolerance = 20; // ±20 degrees from 180
    const analogousTolerance = 15;     // ±15 degrees from 30
    const triadicTolerance = 20;       // ±20 degrees from 120

    // Check for complementary (around 180 degrees)
    if (Math.abs(diff - 180) <= complementaryTolerance) {
        return 'complementary';
    }
    
    // Check for analogous (around 30 degrees)
    if (Math.abs(diff - 30) <= analogousTolerance) {
        return 'analogous';
    }
    
    // Check for triadic (around 120 degrees)
    if (Math.abs(diff - 120) <= triadicTolerance) {
        return 'triadic';
    }

    return 'none';
}

/**
 * Extracts color DNA from an image buffer
 * @param {Buffer} imageBuffer - Image buffer data
 * @returns {Promise<Object>} Color DNA analysis object
 */
async function extractColorDNA(imageBuffer) {
    try {
        // Extract colors using node-vibrant
        const palette = await Vibrant.from(imageBuffer).getPalette();
        
        // Get the most vibrant color as dominant (fallback to other swatches if not available)
        let dominantSwatch = palette.Vibrant || palette.DarkVibrant || palette.LightVibrant || 
                            palette.Muted || palette.DarkMuted || palette.LightMuted;
        
        if (!dominantSwatch) {
            throw new Error('No colors could be extracted from the image');
        }
        
        // Extract RGB values and convert to hex and HSL
        const dominantRgb = dominantSwatch.getRgb();
        const dominantHsl = rgbToHsl(dominantRgb[0], dominantRgb[1], dominantRgb[2]);
        const dominantHex = dominantSwatch.getHex();
        
        // Create palette array from all available swatches
        const paletteWithHsl = [];
        const swatchOrder = ['Vibrant', 'DarkVibrant', 'LightVibrant', 'Muted', 'DarkMuted', 'LightMuted'];
        
        swatchOrder.forEach(swatchName => {
            const swatch = palette[swatchName];
            if (swatch) {
                const rgb = swatch.getRgb();
                const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
                const hex = swatch.getHex();
                paletteWithHsl.push({ hex, hsl });
            }
        });
        
        // If we have less than 8 colors, generate additional colors by adjusting existing ones
        while (paletteWithHsl.length < 8 && paletteWithHsl.length > 0) {
            const baseColor = paletteWithHsl[paletteWithHsl.length % paletteWithHsl.length];
            const [h, s, l] = baseColor.hsl;
            
            // Create variations by adjusting lightness
            const variation = Math.floor(paletteWithHsl.length / swatchOrder.length);
            const newL = Math.max(10, Math.min(90, l + (variation * 20 - 30)));
            const newHsl = [h, s, newL];
            
            // Convert back to hex
            const [r, g, b] = hslToRgb(h / 360, s / 100, newL / 100);
            const newHex = `#${[r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
            
            paletteWithHsl.push({ hex: newHex, hsl: newHsl });
        }
        
        // Calculate saturation profile
        const allSaturations = [dominantHsl[1], ...paletteWithHsl.slice(0, 8).map(c => c.hsl[1])];
        const avgSaturation = allSaturations.reduce((sum, s) => sum + s, 0) / allSaturations.length;
        
        let saturationProfile;
        if (avgSaturation > 65) {
            saturationProfile = 'vibrant';
        } else if (avgSaturation < 35) {
            saturationProfile = 'muted';
        } else {
            saturationProfile = 'mixed';
        }
        
        // Calculate brightness profile
        const allLightness = [dominantHsl[2], ...paletteWithHsl.slice(0, 8).map(c => c.hsl[2])];
        const avgLightness = allLightness.reduce((sum, l) => sum + l, 0) / allLightness.length;
        
        let brightnessProfile;
        if (avgLightness < 35) {
            brightnessProfile = 'dark';
        } else if (avgLightness > 65) {
            brightnessProfile = 'light';
        } else {
            brightnessProfile = 'balanced';
        }
        
        // Determine relationship between dominant and secondary (first palette color)
        let dominantToSecondaryRelationship = 'none';
        if (paletteWithHsl.length > 1) {
            dominantToSecondaryRelationship = getHueRelationship(
                dominantHsl[0], 
                paletteWithHsl[1].hsl[0]  // Use second color as secondary
            );
        }
        
        // Return the color DNA object (limit palette to 8 colors)
        return {
            primary: {
                hex: dominantHex,
                hsl: dominantHsl
            },
            palette: paletteWithHsl.slice(0, 8),
            dominantToSecondaryRelationship,
            saturationProfile,
            brightnessProfile
        };
        
    } catch (error) {
        throw new Error(`Color extraction failed: ${error.message}`);
    }
}

/**
 * Helper function to convert HSL to RGB
 * @param {number} h - Hue (0-1)
 * @param {number} s - Saturation (0-1)  
 * @param {number} l - Lightness (0-1)
 * @returns {number[]} RGB array [r, g, b]
 */
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 255, g * 255, b * 255];
}

module.exports = { extractColorDNA, rgbToHsl, getHueRelationship };
