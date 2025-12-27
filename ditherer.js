// Image processing functions for S-curve tone mapping and dithering
// Ported from ESP32-Photoframe project

// Measured palette - actual displayed colors from e-paper
const PALETTE_MEASURED = [
    [2, 2, 2],        // Black
    [190, 190, 190],  // White
    [205, 202, 0],    // Yellow
    [135, 19, 0],     // Red
    [0, 0, 0],        // Reserved (not used)
    [5, 64, 158],     // Blue
    [39, 102, 60]     // Green
];

// Theoretical palette - for BMP output
const PALETTE_THEORETICAL = [
    [0, 0, 0],        // Black
    [255, 255, 255],  // White
    [255, 255, 0],    // Yellow
    [255, 0, 0],      // Red
    [0, 0, 0],        // Reserved
    [0, 0, 255],      // Blue
    [0, 255, 0]       // Green
];

function applyExposure(data, exposure) {
    if (exposure === 1.0) return;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.round(data[i] * exposure));
        data[i + 1] = Math.min(255, Math.round(data[i + 1] * exposure));
        data[i + 2] = Math.min(255, Math.round(data[i + 2] * exposure));
    }
}

function applySaturation(data, saturation) {
    if (saturation === 1.0) return;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Convert RGB to HSL
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const l = (max + min) / 2;
        
        if (max === min) {
            // Grayscale - no saturation change needed
            continue;
        }
        
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        let h;
        if (max === r / 255) {
            h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6;
        } else if (max === g / 255) {
            h = ((b / 255 - r / 255) / d + 2) / 6;
        } else {
            h = ((r / 255 - g / 255) / d + 4) / 6;
        }
        
        // Adjust saturation
        const newS = Math.max(0, Math.min(1, s * saturation));
        
        // Convert back to RGB
        const c = (1 - Math.abs(2 * l - 1)) * newS;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        
        let rPrime, gPrime, bPrime;
        const hSector = Math.floor(h * 6);
        
        if (hSector === 0) {
            [rPrime, gPrime, bPrime] = [c, x, 0];
        } else if (hSector === 1) {
            [rPrime, gPrime, bPrime] = [x, c, 0];
        } else if (hSector === 2) {
            [rPrime, gPrime, bPrime] = [0, c, x];
        } else if (hSector === 3) {
            [rPrime, gPrime, bPrime] = [0, x, c];
        } else if (hSector === 4) {
            [rPrime, gPrime, bPrime] = [x, 0, c];
        } else {
            [rPrime, gPrime, bPrime] = [c, 0, x];
        }
        
        data[i] = Math.round((rPrime + m) * 255);
        data[i + 1] = Math.round((gPrime + m) * 255);
        data[i + 2] = Math.round((bPrime + m) * 255);
    }
}

function applyScurveTonemap(data, strength, shadowBoost, highlightCompress, midpoint) {
    if (strength === 0) return;
    
    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const normalized = data[i + c] / 255.0;
            let result;
            
            if (normalized <= midpoint) {
                // Shadows: brighten
                const shadowVal = normalized / midpoint;
                result = Math.pow(shadowVal, 1.0 - strength * shadowBoost) * midpoint;
            } else {
                // Highlights: compress
                const highlightVal = (normalized - midpoint) / (1.0 - midpoint);
                result = midpoint + Math.pow(highlightVal, 1.0 + strength * highlightCompress) * (1.0 - midpoint);
            }
            
            data[i + c] = Math.round(Math.max(0, Math.min(1, result)) * 255);
        }
    }
}

function findClosestColorRGB(r, g, b, palette = PALETTE_MEASURED) {
    let minDist = Infinity;
    let closest = 1; // Default to white
    
    for (let i = 0; i < palette.length; i++) {
        if (i === 4) continue; // Skip reserved color
        
        const [pr, pg, pb] = palette[i];
        const dr = r - pr;
        const dg = g - pg;
        const db = b - pb;
        
        // Simple Euclidean distance in RGB space
        const dist = dr * dr + dg * dg + db * db;
        
        if (dist < minDist) {
            minDist = dist;
            closest = i;
        }
    }
    
    return closest;
}

function applyFloydSteinbergDither(width, height, data, outputPalette = PALETTE_THEORETICAL, ditherPalette = PALETTE_MEASURED) {
    // Create error buffer
    const errors = new Array(width * height * 3).fill(0);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const errIdx = (y * width + x) * 3;
            
            // Get old pixel value with accumulated error
            let oldR = data[idx] + errors[errIdx];
            let oldG = data[idx + 1] + errors[errIdx + 1];
            let oldB = data[idx + 2] + errors[errIdx + 2];
            
            // Clamp values
            oldR = Math.max(0, Math.min(255, oldR));
            oldG = Math.max(0, Math.min(255, oldG));
            oldB = Math.max(0, Math.min(255, oldB));
            
            // Find closest color using dither palette
            const colorIdx = findClosestColorRGB(oldR, oldG, oldB, ditherPalette);
            const [newR, newG, newB] = outputPalette[colorIdx];
            
            // Set new pixel color (using output palette)
            data[idx] = newR;
            data[idx + 1] = newG;
            data[idx + 2] = newB;
            // Ensure alpha is full opacity
            data[idx + 3] = 255;
            
            // Calculate error using dither palette (for error diffusion)
            const [ditherR, ditherG, ditherB] = ditherPalette[colorIdx];
            const errR = oldR - ditherR;
            const errG = oldG - ditherG;
            const errB = oldB - ditherB;
            
            // Distribute error to neighboring pixels (Floyd-Steinberg)
            if (x + 1 < width) {
                const nextIdx = (y * width + (x + 1)) * 3;
                errors[nextIdx] += errR * 7 / 16;
                errors[nextIdx + 1] += errG * 7 / 16;
                errors[nextIdx + 2] += errB * 7 / 16;
            }
            
            if (y + 1 < height) {
                if (x > 0) {
                    const nextIdx = ((y + 1) * width + (x - 1)) * 3;
                    errors[nextIdx] += errR * 3 / 16;
                    errors[nextIdx + 1] += errG * 3 / 16;
                    errors[nextIdx + 2] += errB * 3 / 16;
                }
                
                const nextIdx = ((y + 1) * width + x) * 3;
                errors[nextIdx] += errR * 5 / 16;
                errors[nextIdx + 1] += errG * 5 / 16;
                errors[nextIdx + 2] += errB * 5 / 16;
                
                if (x + 1 < width) {
                    const nextIdx = ((y + 1) * width + (x + 1)) * 3;
                    errors[nextIdx] += errR * 1 / 16;
                    errors[nextIdx + 1] += errG * 1 / 16;
                    errors[nextIdx + 2] += errB * 1 / 16;
                }
            }
        }
    }
}

class Ditherer {
    /**
     * Processes raw pixel data with the configured algorithms
     * @param {Buffer} data 
     * @param {number} width 
     * @param {number} height 
     * @param {Object} options 
     */
    process(data, width, height, options) {
        // 1. Apply exposure
        if (options.exposure && options.exposure !== 1.0) {
            applyExposure(data, options.exposure);
        }
        
        // 2. Apply saturation
        if (options.saturation && options.saturation !== 1.0) {
            applySaturation(data, options.saturation);
        }
        
        // 3. Apply tone mapping (S-curve)
        if (options.strength) {
             applyScurveTonemap(
                data,
                options.strength,
                options.shadowBoost,
                options.highlightCompress,
                options.midpoint
            );
        }
        
        // 4. Apply Floyd-Steinberg dithering
        // Use theoretical palette for output (standard colors)
        // Use measured palette for error diffusion calculations (better accuracy)
        applyFloydSteinbergDither(width, height, data, PALETTE_THEORETICAL, PALETTE_MEASURED);
        
        return data;
    }
}

module.exports = new Ditherer();
