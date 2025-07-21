/**
 * Helper function to convert RGB to lightness
 * Uses the relative luminance formula for perceived brightness
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {number} Lightness value (0-100)
 */
function rgbToLightness(r, g, b) {
    // Convert to relative luminance using ITU-R BT.709 coefficients
    // These weights account for human eye sensitivity to different colors
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance * 100;
}

/**
 * Extracts spatial DNA from image data (works with both Canvas ImageData and Sharp-processed data)
 * @param {Object} imageData - Image data object with data, width, height properties
 * @returns {Object} Spatial DNA analysis object
 */
function extractSpatialDNA(imageData) {
    const { data, width, height } = imageData;
    const whitespaceThreshold = 95; // Lightness threshold for whitespace (95%)
    const goldenRatio = 1.618;
    const goldenRatioTolerance = 0.1; // ±0.1 tolerance for golden ratio detection
    
    // Initialize bounding box coordinates
    let contentTop = height;
    let contentBottom = 0;
    let contentLeft = width;
    let contentRight = 0;
    
    let hasContent = false;
    
    // Scan through all pixels to find content boundaries
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Calculate pixel index in the data array
            // Each pixel has 4 values: R, G, B, A
            const pixelIndex = (y * width + x) * 4;
            
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const alpha = data[pixelIndex + 3];
            
            // Skip transparent pixels
            if (alpha === 0) continue;
            
            // Calculate lightness
            const lightness = rgbToLightness(r, g, b);
            
            // If pixel is not whitespace (content pixel)
            if (lightness <= whitespaceThreshold) {
                hasContent = true;
                
                // Update bounding box
                contentTop = Math.min(contentTop, y);
                contentBottom = Math.max(contentBottom, y);
                contentLeft = Math.min(contentLeft, x);
                contentRight = Math.max(contentRight, x);
            }
        }
    }
    
    // Handle case where no content is found
    if (!hasContent) {
        return {
            whitespaceDistribution: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            },
            contentAspectRatio: 0,
            usesGoldenRatio: false,
            dominantAxisAlignment: 'centered'
        };
    }
    
    // Calculate margin ratios relative to image dimensions
    const marginTop = contentTop / height;
    const marginBottom = (height - contentBottom - 1) / height;
    const marginLeft = contentLeft / width;
    const marginRight = (width - contentRight - 1) / width;
    
    // Calculate content dimensions
    const contentWidth = contentRight - contentLeft + 1;
    const contentHeight = contentBottom - contentTop + 1;
    
    // Calculate content aspect ratio (width/height)
    const contentAspectRatio = contentHeight > 0 ? contentWidth / contentHeight : 0;
    
    // Check if content ratio is close to golden ratio
    const usesGoldenRatio = Math.abs(contentAspectRatio - goldenRatio) <= goldenRatioTolerance ||
                           Math.abs(contentAspectRatio - (1 / goldenRatio)) <= goldenRatioTolerance;
    
    // Determine dominant axis alignment based on smallest margins
    let dominantAxisAlignment;
    const margins = {
        top: marginTop,
        bottom: marginBottom,
        left: marginLeft,
        right: marginRight
    };
    
    // Find the smallest margin to determine alignment
    const minVerticalMargin = Math.min(marginTop, marginBottom);
    const minHorizontalMargin = Math.min(marginLeft, marginRight);
    
    if (minVerticalMargin < minHorizontalMargin) {
        // Content is pushed to top or bottom
        dominantAxisAlignment = marginTop < marginBottom ? 'top' : 'bottom';
        // For simplicity, map top/bottom to vertical
        dominantAxisAlignment = 'vertical';
    } else if (minHorizontalMargin < minVerticalMargin) {
        // Content is pushed to left or right
        dominantAxisAlignment = marginLeft < marginRight ? 'left' : 'right';
        // For simplicity, map left/right to horizontal
        dominantAxisAlignment = 'horizontal';
    } else {
        // Margins are relatively equal
        dominantAxisAlignment = 'centered';
    }
    
    // Return the spatial DNA object
    return {
        whitespaceDistribution: {
            top: Math.round(marginTop * 1000) / 1000,      // Round to 3 decimal places
            right: Math.round(marginRight * 1000) / 1000,
            bottom: Math.round(marginBottom * 1000) / 1000,
            left: Math.round(marginLeft * 1000) / 1000
        },
        contentAspectRatio: Math.round(contentAspectRatio * 1000) / 1000,
        usesGoldenRatio,
        dominantAxisAlignment
    };
}

module.exports = { extractSpatialDNA, rgbToLightness };
