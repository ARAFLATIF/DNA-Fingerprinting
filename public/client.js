// Get DOM element references
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const designCanvas = document.getElementById('design-canvas');
const jsonOutput = document.getElementById('json-output');
const applyDnaBtn = document.getElementById('apply-dna-btn');
const exportDnaBtn = document.getElementById('export-dna-btn');
const importDnaInput = document.getElementById('import-dna-input');
const dnaActions = document.querySelector('.dna-actions');

// Global variable to store the last DNA analysis
let lastDnaAnalysis = null;
let currentSketch = null; // Store current p5.js sketch instance

// DNA Comparison variables
let dnaProfileA = null;
let dnaProfileB = null;

// Add event listeners
dropZone.addEventListener('click', () => {
    fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#4a5568';
    dropZone.style.backgroundColor = '#f7fafc';
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#cbd5e0';
    dropZone.style.backgroundColor = '#fff';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#cbd5e0';
    dropZone.style.backgroundColor = '#fff';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Add event listener for Apply DNA button
applyDnaBtn.addEventListener('click', () => {
    if (lastDnaAnalysis) {
        applyDNA(lastDnaAnalysis);
    } else {
        showError('No DNA analysis available. Please upload an image first.');
    }
});

// DNA Comparison event listeners
const dropZoneA = document.getElementById('drop-zone-a');
const dropZoneB = document.getElementById('drop-zone-b');
const fileInputA = document.getElementById('file-input-a');
const fileInputB = document.getElementById('file-input-b');
const compareBtn = document.getElementById('compare-btn');

// Setup comparison drop zones
setupComparisonDropZone(dropZoneA, fileInputA, 'A');
setupComparisonDropZone(dropZoneB, fileInputB, 'B');

// Compare button event listener
compareBtn.addEventListener('click', () => {
    if (dnaProfileA && dnaProfileB) {
        const similarity = compareDNA(dnaProfileA.designDNA, dnaProfileB.designDNA);
        displaySimilarityScore(similarity);
    } else {
        showError('Please upload both Design A and Design B before comparing.');
    }
});

// DNA Export/Import event listeners
exportDnaBtn.addEventListener('click', exportDNA);
importDnaInput.addEventListener('change', importDNA);

// Handle file function
async function handleFile(file) {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }
    
    // Show loading state
    showLoading();
    
    try {
        // Create FileReader for image display
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            // Create new Image object
            const img = new Image();
            
            img.onload = async () => {
                // Display image on canvas
                displayImage(img);
                
                // After drawing the image to canvas, extract DNA
                try {
                    // 1. Create FormData object and append the file
                    const formData = new FormData();
                    formData.append('image', file);
                    
                    // 2. Use fetch API to send FormData to /api/extract endpoint
                    const response = await fetch('/api/extract', {
                        method: 'POST',
                        body: formData
                    });
                    
                    // Check if response is successful
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to extract DNA');
                    }
                    
                    // 3. Parse the JSON response
                    const data = await response.json();
                    
                    // Store the DNA analysis globally
                    lastDnaAnalysis = data;
                    
                    // 4. Display the JSON response in the json-output pre tag
                    jsonOutput.textContent = JSON.stringify(data, null, 2);
                    
                    // 5. Make the JSON output area visible
                    jsonOutput.style.display = 'block';
                    
                    // Show the Apply DNA button and export/import actions
                    applyDnaBtn.style.display = 'block';
                    dnaActions.style.display = 'flex';
                    
                    // Draw the Visual DNA Fingerprint
                    if (typeof p5 !== 'undefined') {
                        drawFingerprint(data);
                    } else {
                        console.log('p5.js not available, using canvas fallback');
                        drawFingerprintCanvas(data);
                    }
                    
                    // Hide loading state
                    hideLoading();
                    
                    // Scroll to results
                    jsonOutput.scrollIntoView({ behavior: 'smooth' });
                    
                } catch (error) {
                    hideLoading();
                    showError(`DNA extraction failed: ${error.message}`);
                }
            };
            
            img.onerror = () => {
                hideLoading();
                showError('Failed to load image');
            };
            
            // Set image source
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            hideLoading();
            showError('Failed to read file');
        };
        
        // Read file as data URL
        reader.readAsDataURL(file);
        
    } catch (error) {
        hideLoading();
        showError(`File processing failed: ${error.message}`);
    }
}

// Display image on canvas
function displayImage(img) {
    // Get canvas context
    const ctx = designCanvas.getContext('2d');
    
    // Calculate dimensions to fit image within max width/height
    const maxWidth = 600;
    const maxHeight = 400;
    let width = img.width;
    let height = img.height;
    
    // Scale down if necessary
    if (width > maxWidth || height > maxHeight) {
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);
        width *= ratio;
        height *= ratio;
    }
    
    // Set canvas dimensions
    designCanvas.width = width;
    designCanvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, designCanvas.width, designCanvas.height);
    
    // Draw image
    ctx.drawImage(img, 0, 0, width, height);
    
    // Make canvas visible
    designCanvas.style.display = 'block';
    
    // Update drop zone text
    dropZone.querySelector('p').textContent = 'Upload Another Design';
}

// Show loading state
function showLoading() {
    dropZone.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Analyzing Design DNA...</p>
            <small>Processing image and extracting color & spatial data...</small>
        </div>
    `;
}

// Hide loading state
function hideLoading() {
    dropZone.innerHTML = '<p>Upload Another Design</p>';
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <p><strong>Error:</strong> ${message}</p>
        <button onclick="this.parentElement.remove()">Close</button>
    `;
    
    document.body.insertBefore(errorDiv, document.body.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

/**
 * Helper function to convert HSL to Hex
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string
 */
function hslToHex(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) {
        r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 1/3) {
        r = x; g = c; b = 0;
    } else if (1/3 <= h && h < 1/2) {
        r = 0; g = c; b = x;
    } else if (1/2 <= h && h < 2/3) {
        r = 0; g = x; b = c;
    } else if (2/3 <= h && h < 5/6) {
        r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Core style transfer logic - applies DNA to target design
 * @param {Object} dnaObject - Complete DNA analysis object from API
 */
async function applyDNA(dnaObject) {
    try {
        // 1. Check if valid dnaObject was passed
        if (!dnaObject || !dnaObject.designDNA) {
            throw new Error('Invalid DNA object provided');
        }

        const { designDNA } = dnaObject;
        
        // 2. Access the document's root element
        const root = document.documentElement;
        
        // Extract DNA components
        const colorDNA = designDNA.colorDNA;
        const spatialDNA = designDNA.spatialDNA;
        const typographyDNA = designDNA.typographyDNA;
        const primaryColor = colorDNA.primary;
        
        console.log('Applying DNA with typography:', typographyDNA);
        
        // 3. Set CSS variables based on DNA analysis
        
        // COLOR VARIABLES
        // Set --card-bg-color: Adjust primary color lightness for background use
        const [primaryH, primaryS, primaryL] = primaryColor.hsl;
        let bgLightness;
        if (primaryL < 50) {
            // Dark primary color - use very light background
            bgLightness = Math.max(85, primaryL + 40);
        } else {
            // Light primary color - use darker background 
            bgLightness = Math.min(25, primaryL - 30);
        }
        const cardBgColor = hslToHex(primaryH, Math.max(10, primaryS - 20), bgLightness);
        root.style.setProperty('--card-bg-color', cardBgColor);
        
        // Set --card-text-color to primary hex
        root.style.setProperty('--card-text-color', primaryColor.hex);
        
        // Set --card-accent-color based on relationship
        let accentColor = colorDNA.palette[0]?.hex || '#007bff'; // Default fallback
        
        // Choose accent color based on dominant relationship
        switch (colorDNA.dominantToSecondaryRelationship) {
            case 'complementary':
                // Find most contrasting color in palette
                accentColor = colorDNA.palette.find(color => {
                    const [h] = color.hsl;
                    const diff = Math.abs(h - primaryH);
                    return diff > 150 && diff < 210; // ~180 degrees apart
                })?.hex || colorDNA.palette[1]?.hex || '#007bff';
                break;
            case 'analogous':
                // Find similar hue color
                accentColor = colorDNA.palette.find(color => {
                    const [h] = color.hsl;
                    const diff = Math.abs(h - primaryH);
                    return diff < 60; // Similar hue
                })?.hex || colorDNA.palette[1]?.hex || '#007bff';
                break;
            case 'triadic':
                // Find triadic color (~120 degrees)
                accentColor = colorDNA.palette.find(color => {
                    const [h] = color.hsl;
                    const diff = Math.abs(h - primaryH);
                    return diff > 100 && diff < 140; // ~120 degrees apart
                })?.hex || colorDNA.palette[2]?.hex || '#007bff';
                break;
            default:
                // Use second color in palette
                accentColor = colorDNA.palette[1]?.hex || '#007bff';
        }
        root.style.setProperty('--card-accent-color', accentColor);
        
        // SPATIAL VARIABLES
        // Set --card-padding based on whitespace distribution
        const whitespace = spatialDNA.whitespaceDistribution;
        const avgHorizontalMargin = (whitespace.left + whitespace.right) / 2;
        // Convert margin ratio to padding pixels (base 20px, scale with margin)
        const cardPadding = Math.max(10, Math.min(40, 20 + (avgHorizontalMargin * 100)));
        root.style.setProperty('--card-padding', `${Math.round(cardPadding)}px`);
        
        // Set --card-element-spacing based on vertical whitespace
        const avgVerticalMargin = (whitespace.top + whitespace.bottom) / 2;
        // Convert to spacing pixels (base 15px, scale with margin)
        const elementSpacing = Math.max(8, Math.min(30, 15 + (avgVerticalMargin * 80)));
        root.style.setProperty('--card-element-spacing', `${Math.round(elementSpacing)}px`);
        
        // Optional: Set border radius based on content aspect ratio
        const borderRadius = spatialDNA.usesGoldenRatio ? 12 : 8;
        root.style.setProperty('--card-border-radius', `${borderRadius}px`);
        
        // TYPOGRAPHY VARIABLES
        if (typographyDNA) {
            // Set font families
            root.style.setProperty('--font-heading', typographyDNA.fontPairing.heading);
            root.style.setProperty('--font-body', typographyDNA.fontPairing.body);
            
            // Set font weights
            root.style.setProperty('--font-weight-heading', typographyDNA.weightRelationships.heading);
            root.style.setProperty('--font-weight-body', typographyDNA.weightRelationships.body);
            
            // Set font sizes
            const baseSize = typographyDNA.sizeHierarchy.base;
            const h2Ratio = typographyDNA.sizeHierarchy.h2Ratio;
            const h2Size = Math.round(baseSize * h2Ratio);
            
            root.style.setProperty('--font-size-base', `${baseSize}px`);
            root.style.setProperty('--font-size-h2', `${h2Size}px`);
            
            console.log(`Typography applied - Base: ${baseSize}px, H2: ${h2Size}px`);
            console.log(`Fonts - Heading: ${typographyDNA.fontPairing.heading}, Body: ${typographyDNA.fontPairing.body}`);
        }
        
        // EDGE BROWSER COMPATIBILITY FIX
        // Apply styles directly to elements as fallback for Microsoft Edge
        const designCard = document.querySelector('.design-card');
        const cardH2 = document.querySelector('.design-card h2');
        const cardP = document.querySelector('.design-card p');
        const cardButton = document.querySelector('.design-card button');
        
        if (designCard && cardH2 && cardP) {
            // Apply background and text colors directly
            designCard.style.backgroundColor = cardBgColor;
            designCard.style.padding = `${Math.round(cardPadding)}px`;
            designCard.style.borderRadius = `${borderRadius}px`;
            
            cardH2.style.color = primaryColor.hex;
            cardP.style.color = primaryColor.hex;
            
            // Apply typography directly
            if (typographyDNA) {
                const baseSize = typographyDNA.sizeHierarchy.base;
                const h2Size = Math.round(baseSize * typographyDNA.sizeHierarchy.h2Ratio);
                
                cardH2.style.fontFamily = typographyDNA.fontPairing.heading;
                cardH2.style.fontSize = `${h2Size}px`;
                cardH2.style.fontWeight = typographyDNA.weightRelationships.heading;
                cardH2.style.marginBottom = `${Math.round(elementSpacing)}px`;
                
                cardP.style.fontFamily = typographyDNA.fontPairing.body;
                cardP.style.fontSize = `${baseSize}px`;
                cardP.style.fontWeight = typographyDNA.weightRelationships.body;
                cardP.style.marginBottom = `${Math.round(elementSpacing)}px`;
            }
            
            // Apply accent color to button
            if (cardButton) {
                cardButton.style.backgroundColor = accentColor;
                cardButton.style.borderRadius = `${borderRadius}px`;
            }
            
            console.log('Edge compatibility styles applied directly');
        }
        
        // Show success message with detailed info
        const appliedStyles = [
            `Colors: ${primaryColor.hex} primary`,
            `Typography: ${typographyDNA?.style || 'default'} style`,
            `Fonts: ${typographyDNA?.fontPairing.heading.split(',')[0].replace(/'/g, '') || 'default'}`,
            `Spacing: ${Math.round(cardPadding)}px padding`
        ];
        
        showSuccessMessage(`Design DNA applied! ${appliedStyles.join(' • ')}`);
        
        // Scroll to target design to show the changes
        document.querySelector('.target-container').scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
        
    } catch (error) {
        console.error('Error applying DNA:', error);
        showError(`Failed to apply DNA: ${error.message}`);
    }
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <p><strong>Success:</strong> ${message}</p>
        <button onclick="this.parentElement.remove()">Close</button>
    `;
    
    document.body.insertBefore(successDiv, document.body.firstChild);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 3000);
}

/**
 * Creates a Visual DNA Fingerprint using p5.js
 * @param {Object} dnaObject - Complete DNA analysis object from API
 */
function drawFingerprint(dnaObject) {
    // Function to attempt drawing with retries
    function attemptDraw(retries = 0) {
        // Check if p5.js is loaded
        if (typeof p5 === 'undefined') {
            if (retries < 10) {
                console.log(`p5.js not ready, retrying... (${retries + 1}/10)`);
                setTimeout(() => attemptDraw(retries + 1), 500);
                return;
            } else {
                console.error('p5.js failed to load after multiple attempts');
                showError('p5.js library failed to load. Please check your internet connection and refresh.');
                return;
            }
        }
        
        try {
            // Clear any existing sketch
            if (currentSketch) {
                currentSketch.remove();
                currentSketch = null;
            }
            
            const { designDNA } = dnaObject;
            const colorDNA = designDNA.colorDNA;
            const primaryColor = colorDNA.primary;
            const palette = colorDNA.palette;
            
            console.log('Drawing fingerprint with', palette.length, 'colors');
            
            // Create p5.js sketch
            const sketch = (p) => {
                p.setup = () => {
                    // Create canvas in the container
                    const canvas = p.createCanvas(400, 400);
                    canvas.parent('fingerprint-canvas-container');
                    
                    // Set canvas background to dark gray
                    p.background(25, 25, 30);
                    
                    // Draw the fingerprint
                    drawRadialBars(p, palette, primaryColor);
                    
                    // Add info text below canvas
                    addFingerprintInfo(palette.length, primaryColor.hex);
                };
            };
            
            // Create the sketch instance
            currentSketch = new p5(sketch);
            console.log('Visual DNA Fingerprint created successfully!');
            
        } catch (error) {
            console.error('Error drawing fingerprint:', error);
            showError(`Failed to draw fingerprint: ${error.message}`);
        }
    }
    
    // Start the attempt
    attemptDraw();
}

/**
 * Draws radial bars representing the color DNA
 * @param {Object} p - p5.js instance
 * @param {Array} palette - Array of color objects with hex and hsl values
 * @param {Object} primaryColor - Primary color object
 */
function drawRadialBars(p, palette, primaryColor) {
    const centerX = p.width / 2;
    const centerY = p.height / 2;
    const maxRadius = Math.min(p.width, p.height) / 2 - 20;
    
    // Draw each color as a radial bar
    palette.forEach((color, index) => {
        const [hue, saturation, lightness] = color.hsl;
        
        // Map hue to angle (0-360° to 0-2π radians)
        const angle = p.map(hue, 0, 360, 0, p.TWO_PI);
        
        // Map saturation to bar length (0-100 to 20-maxRadius)
        const barLength = p.map(saturation, 0, 100, 20, maxRadius);
        
        // Map lightness to bar thickness (0-100 to 2-15 pixels)
        const barThickness = p.map(lightness, 0, 100, 2, 15);
        
        // Check if this is the primary color
        const isPrimary = color.hex === primaryColor.hex;
        
        // Set color
        p.fill(color.hex);
        p.noStroke();
        
        // Draw primary color with glow effect
        if (isPrimary) {
            // Add glow effect for primary color
            p.drawingContext.shadowColor = color.hex;
            p.drawingContext.shadowBlur = 15;
            
            // Make primary bar slightly thicker
            const primaryThickness = barThickness * 1.5;
            
            // Draw the bar
            drawRadialBar(p, centerX, centerY, angle, barLength, primaryThickness);
            
            // Reset shadow
            p.drawingContext.shadowBlur = 0;
        } else {
            // Draw regular bar
            drawRadialBar(p, centerX, centerY, angle, barLength, barThickness);
        }
    });
    
    // Draw center circle
    p.fill(60, 60, 70);
    p.noStroke();
    p.ellipse(centerX, centerY, 20, 20);
}

/**
 * Draws a single radial bar
 * @param {Object} p - p5.js instance
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} angle - Angle in radians
 * @param {number} length - Length of the bar
 * @param {number} thickness - Thickness of the bar
 */
function drawRadialBar(p, centerX, centerY, angle, length, thickness) {
    p.push();
    p.translate(centerX, centerY);
    p.rotate(angle);
    
    // Draw rectangle as bar
    p.rectMode(p.CORNER);
    p.rect(10, -thickness/2, length, thickness);
    
    p.pop();
}

/**
 * Creates a Visual DNA Fingerprint using native Canvas (fallback)
 * @param {Object} dnaObject - Complete DNA analysis object from API
 */
function drawFingerprintCanvas(dnaObject) {
    try {
        const { designDNA } = dnaObject;
        const colorDNA = designDNA.colorDNA;
        const primaryColor = colorDNA.primary;
        const palette = colorDNA.palette;
        
        console.log('Drawing canvas fingerprint with', palette.length, 'colors');
        
        // Create canvas element
        const container = document.getElementById('fingerprint-canvas-container');
        container.innerHTML = ''; // Clear existing content
        
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.borderRadius = '8px';
        canvas.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
        
        const ctx = canvas.getContext('2d');
        
        // Set dark background
        ctx.fillStyle = 'rgb(25, 25, 30)';
        ctx.fillRect(0, 0, 400, 400);
        
        const centerX = 200;
        const centerY = 200;
        const maxRadius = 180;
        
        // Draw each color as a radial bar
        palette.forEach((color, index) => {
            const [hue, saturation, lightness] = color.hsl;
            
            // Map hue to angle (0-360° to 0-2π radians)
            const angle = (hue / 360) * Math.PI * 2;
            
            // Map saturation to bar length (0-100 to 20-maxRadius)
            const barLength = 20 + (saturation / 100) * (maxRadius - 20);
            
            // Map lightness to bar thickness (0-100 to 2-15 pixels)
            const barThickness = 2 + (lightness / 100) * 13;
            
            // Check if this is the primary color
            const isPrimary = color.hex === primaryColor.hex;
            
            // Set color
            ctx.fillStyle = color.hex;
            
            // Add glow for primary color
            if (isPrimary) {
                ctx.shadowColor = color.hex;
                ctx.shadowBlur = 15;
            } else {
                ctx.shadowBlur = 0;
            }
            
            // Draw the bar
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            
            const thickness = isPrimary ? barThickness * 1.5 : barThickness;
            ctx.fillRect(10, -thickness/2, barLength, thickness);
            
            ctx.restore();
        });
        
        // Draw center circle
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgb(60, 60, 70)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Add canvas to container
        container.appendChild(canvas);
        
        // Add info text
        addFingerprintInfo(palette.length, primaryColor.hex);
        
        console.log('Canvas fingerprint created successfully!');
        
    } catch (error) {
        console.error('Error drawing canvas fingerprint:', error);
        showError(`Failed to draw fingerprint: ${error.message}`);
    }
}
function addFingerprintInfo(colorCount, primaryHex) {
    const container = document.getElementById('fingerprint-canvas-container');
    
    // Remove existing info
    const existingInfo = container.querySelector('.fingerprint-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Add new info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'fingerprint-info';
    infoDiv.innerHTML = `
        <p><strong>Visual DNA Analysis:</strong> ${colorCount} colors detected</p>
        <p><strong>Primary Color:</strong> ${primaryHex} (highlighted with glow)</p>
        <p><small>Angle = Hue • Length = Saturation • Thickness = Lightness</small></p>
    `;
    
    container.appendChild(infoDiv);
}

/**
 * Sets up comparison drop zone functionality
 * @param {HTMLElement} dropZone - Drop zone element
 * @param {HTMLElement} fileInput - File input element
 * @param {string} side - 'A' or 'B' to identify which side
 */
function setupComparisonDropZone(dropZone, fileInput, side) {
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4a5568';
        dropZone.style.backgroundColor = '#f7fafc';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#cbd5e0';
        dropZone.style.backgroundColor = '#fff';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#cbd5e0';
        dropZone.style.backgroundColor = '#fff';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleComparisonFile(files[0], side);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleComparisonFile(files[0], side);
        }
    });
}

/**
 * Handles file upload for comparison
 * @param {File} file - Uploaded file
 * @param {string} side - 'A' or 'B'
 */
async function handleComparisonFile(file, side) {
    if (!file.type.startsWith('image/')) {
        showError('Please upload an image file');
        return;
    }

    try {
        const dropZone = document.getElementById(`drop-zone-${side.toLowerCase()}`);
        const canvas = document.getElementById(`preview-canvas-${side.toLowerCase()}`);
        
        // Show loading state
        dropZone.innerHTML = '<p>Analyzing...</p>';
        
        // Display preview
        await displayComparisonPreview(file, canvas);
        
        // Extract DNA
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/extract', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to extract DNA');
        }
        
        const data = await response.json();
        
        // Store DNA profile
        if (side === 'A') {
            dnaProfileA = data;
        } else {
            dnaProfileB = data;
        }
        
        // Update UI
        dropZone.innerHTML = `<p>Design ${side} Ready!</p>`;
        dropZone.classList.add('has-image');
        
        // Enable compare button if both profiles ready
        updateCompareButton();
        
        console.log(`DNA Profile ${side} extracted successfully`);
        
    } catch (error) {
        console.error(`Error processing Design ${side}:`, error);
        showError(`Failed to process Design ${side}: ${error.message}`);
        
        // Reset drop zone
        const dropZone = document.getElementById(`drop-zone-${side.toLowerCase()}`);
        dropZone.innerHTML = `<p>Drop Design ${side} Here</p>`;
    }
}

/**
 * Displays preview of uploaded image for comparison
 * @param {File} file - Image file
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
async function displayComparisonPreview(file, canvas) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                
                // Calculate dimensions
                const maxWidth = 250;
                const maxHeight = 200;
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    const widthRatio = maxWidth / width;
                    const heightRatio = maxHeight / height;
                    const ratio = Math.min(widthRatio, heightRatio);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.style.display = 'block';
                resolve();
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Updates the compare button state
 */
function updateCompareButton() {
    const compareBtn = document.getElementById('compare-btn');
    const hasProfiles = dnaProfileA && dnaProfileB;
    
    compareBtn.disabled = !hasProfiles;
    compareBtn.textContent = hasProfiles ? 'Compare DNA' : 'Upload Both Designs';
}

/**
 * Helper function to convert HSL to LAB color space for CIE76 calculations
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {Object} LAB color values
 */
function hslToLab(h, s, l) {
    // First convert HSL to RGB
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
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
    
    // Convert RGB to XYZ
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    
    let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    let z = r * 0.0193 + g * 0.1192 + b * 0.9505;
    
    // Convert XYZ to LAB
    x = x / 0.95047;
    y = y / 1.00000;
    z = z / 1.08883;
    
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
    
    return {
        L: (116 * y) - 16,
        A: 500 * (x - y),
        B: 200 * (y - z)
    };
}

/**
 * Calculates CIE76 color difference between two LAB colors
 * @param {Object} lab1 - First LAB color
 * @param {Object} lab2 - Second LAB color
 * @returns {number} Color difference (0-100, lower is more similar)
 */
function calculateCIE76(lab1, lab2) {
    const deltaL = lab1.L - lab2.L;
    const deltaA = lab1.A - lab2.A;
    const deltaB = lab1.B - lab2.B;
    
    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * Compares two DNA profiles and returns similarity percentage
 * @param {Object} dnaA - First DNA profile
 * @param {Object} dnaB - Second DNA profile
 * @returns {number} Similarity score (0-100)
 */
function compareDNA(dnaA, dnaB) {
    let totalScore = 0;
    
    // COLOR SCORE (50% of total)
    let colorScore = 0;
    
    // Compare saturation and brightness profiles (20% of color score)
    let profileScore = 0;
    if (dnaA.colorDNA.saturationProfile === dnaB.colorDNA.saturationProfile) {
        profileScore += 10;
    }
    if (dnaA.colorDNA.brightnessProfile === dnaB.colorDNA.brightnessProfile) {
        profileScore += 10;
    }
    
    // Compare color palettes using CIE76 (80% of color score)
    let paletteScore = 0;
    const maxColors = Math.min(dnaA.colorDNA.palette.length, dnaB.colorDNA.palette.length);
    let totalColorDiff = 0;
    
    for (let i = 0; i < maxColors; i++) {
        const colorA = dnaA.colorDNA.palette[i];
        const colorB = dnaB.colorDNA.palette[i];
        
        const labA = hslToLab(colorA.hsl[0], colorA.hsl[1], colorA.hsl[2]);
        const labB = hslToLab(colorB.hsl[0], colorB.hsl[1], colorB.hsl[2]);
        
        const colorDiff = calculateCIE76(labA, labB);
        totalColorDiff += colorDiff;
    }
    
    const avgColorDiff = totalColorDiff / maxColors;
    paletteScore = Math.max(0, 40 - (avgColorDiff / 100 * 40)); // Scale color difference to 0-40
    
    colorScore = profileScore + paletteScore;
    
    // SPATIAL SCORE (30% of total)
    let spatialScore = 0;
    
    // Compare aspect ratios (15% of total)
    const aspectDiff = Math.abs(dnaA.spatialDNA.contentAspectRatio - dnaB.spatialDNA.contentAspectRatio);
    const aspectScore = Math.max(0, 15 - (aspectDiff * 10));
    
    // Compare whitespace distribution (15% of total)
    let whitespaceScore = 0;
    const whitespaceA = dnaA.spatialDNA.whitespaceDistribution;
    const whitespaceB = dnaB.spatialDNA.whitespaceDistribution;
    
    const topDiff = Math.abs(whitespaceA.top - whitespaceB.top);
    const rightDiff = Math.abs(whitespaceA.right - whitespaceB.right);
    const bottomDiff = Math.abs(whitespaceA.bottom - whitespaceB.bottom);
    const leftDiff = Math.abs(whitespaceA.left - whitespaceB.left);
    
    const avgWhitespaceDiff = (topDiff + rightDiff + bottomDiff + leftDiff) / 4;
    whitespaceScore = Math.max(0, 15 - (avgWhitespaceDiff * 50));
    
    spatialScore = aspectScore + whitespaceScore;
    
    // TYPOGRAPHY SCORE (20% of total)
    let typographyScore = 0;
    
    if (dnaA.typographyDNA && dnaB.typographyDNA) {
        // Compare font styles (10% of total)
        if (dnaA.typographyDNA.style === dnaB.typographyDNA.style) {
            typographyScore += 10;
        }
        
        // Compare weight relationships (10% of total)
        const headingWeightDiff = Math.abs(dnaA.typographyDNA.weightRelationships.heading - dnaB.typographyDNA.weightRelationships.heading);
        const bodyWeightDiff = Math.abs(dnaA.typographyDNA.weightRelationships.body - dnaB.typographyDNA.weightRelationships.body);
        const avgWeightDiff = (headingWeightDiff + bodyWeightDiff) / 2;
        typographyScore += Math.max(0, 10 - (avgWeightDiff / 100));
    }
    
    // FINAL SCORE
    totalScore = colorScore + spatialScore + typographyScore;
    
    console.log('DNA Comparison Scores:', {
        color: colorScore,
        spatial: spatialScore,
        typography: typographyScore,
        total: totalScore
    });
    
    return Math.round(Math.max(0, Math.min(100, totalScore)));
}

/**
 * Displays the similarity score with appropriate styling
 * @param {number} similarity - Similarity score (0-100)
 */
function displaySimilarityScore(similarity) {
    const scoreElement = document.getElementById('similarity-score');
    
    scoreElement.textContent = `Similarity: ${similarity}%`;
    
    // Remove existing classes
    scoreElement.classList.remove('similarity-high', 'similarity-medium', 'similarity-low');
    
    // Add appropriate class based on score
    if (similarity >= 75) {
        scoreElement.classList.add('similarity-high');
    } else if (similarity >= 50) {
        scoreElement.classList.add('similarity-medium');
    } else {
        scoreElement.classList.add('similarity-low');
    }
    
    // Scroll to result
    scoreElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Exports the current DNA profile as a JSON file
 */
function exportDNA() {
    try {
        if (!lastDnaAnalysis) {
            showError('No DNA profile available to export. Please upload an image first.');
            return;
        }

        // Create the export data
        const exportData = {
            exported: new Date().toISOString(),
            version: '1.0.0',
            source: 'DNA Fingerprinting Tool',
            filename: lastDnaAnalysis.designDNA.metadata.filename,
            designDNA: lastDnaAnalysis.designDNA
        };

        // Convert to JSON string
        const jsonString = JSON.stringify(exportData, null, 2);

        // Create blob
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Generate download URL
        const url = URL.createObjectURL(blob);

        // Create temporary download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        
        // Generate filename based on original image name or timestamp
        const originalName = lastDnaAnalysis.designDNA.metadata.filename;
        const baseName = originalName ? originalName.split('.')[0] : 'design';
        downloadLink.download = `${baseName}-dna-profile.json`;

        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Clean up URL
        URL.revokeObjectURL(url);

        showSuccessMessage(`DNA profile exported as ${downloadLink.download}`);
        console.log('DNA profile exported successfully');

    } catch (error) {
        console.error('Error exporting DNA:', error);
        showError(`Failed to export DNA profile: ${error.message}`);
    }
}

/**
 * Imports a DNA profile from a JSON file
 * @param {Event} event - File input change event
 */
function importDNA(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        showError('Please select a valid JSON file.');
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            // Parse JSON
            const importedData = JSON.parse(e.target.result);

            // Validate DNA structure
            if (!validateDNAStructure(importedData)) {
                showError('Invalid DNA profile format. Please check the file structure.');
                return;
            }

            // Set as current DNA profile
            lastDnaAnalysis = {
                success: true,
                designDNA: importedData.designDNA || importedData
            };

            // Update UI with imported DNA
            updateUIWithImportedDNA(lastDnaAnalysis);

            // Show success message
            const sourceInfo = importedData.filename ? ` from ${importedData.filename}` : '';
            showSuccessMessage(`DNA profile imported successfully${sourceInfo}!`);
            
            console.log('DNA profile imported:', lastDnaAnalysis);

        } catch (error) {
            console.error('Error parsing imported DNA:', error);
            showError('Failed to parse DNA file. Please check the file format.');
        }
    };

    reader.onerror = () => {
        showError('Failed to read the DNA file.');
    };

    reader.readAsText(file);

    // Clear the input
    event.target.value = '';
}

/**
 * Validates the structure of imported DNA data
 * @param {Object} data - Imported data object
 * @returns {boolean} True if valid DNA structure
 */
function validateDNAStructure(data) {
    try {
        // Check if it's wrapped in the expected structure or direct designDNA
        const dnaToCheck = data.designDNA || data;

        // Required top-level properties
        const requiredProps = ['colorDNA', 'spatialDNA', 'metadata'];
        
        for (const prop of requiredProps) {
            if (!dnaToCheck[prop]) {
                console.error(`Missing required property: ${prop}`);
                return false;
            }
        }

        // Check colorDNA structure
        const colorDNA = dnaToCheck.colorDNA;
        if (!colorDNA.primary || !colorDNA.palette || !Array.isArray(colorDNA.palette)) {
            console.error('Invalid colorDNA structure');
            return false;
        }

        // Check spatialDNA structure
        const spatialDNA = dnaToCheck.spatialDNA;
        if (!spatialDNA.whitespaceDistribution || typeof spatialDNA.contentAspectRatio !== 'number') {
            console.error('Invalid spatialDNA structure');
            return false;
        }

        // Check metadata structure
        const metadata = dnaToCheck.metadata;
        if (!metadata.filename || !metadata.timestamp) {
            console.error('Invalid metadata structure');
            return false;
        }

        return true;

    } catch (error) {
        console.error('Error validating DNA structure:', error);
        return false;
    }
}

/**
 * Updates the UI with imported DNA data
 * @param {Object} dnaData - Imported DNA data
 */
function updateUIWithImportedDNA(dnaData) {
    try {
        // Update JSON output
        jsonOutput.textContent = JSON.stringify(dnaData, null, 2);
        jsonOutput.style.display = 'block';

        // Show action buttons
        applyDnaBtn.style.display = 'block';
        dnaActions.style.display = 'flex';

        // Automatically apply DNA to target design
        applyDNA(dnaData);

        // Draw fingerprint visualization
        if (typeof p5 !== 'undefined') {
            drawFingerprint(dnaData);
        } else {
            drawFingerprintCanvas(dnaData);
        }

        // Update drop zone text
        dropZone.querySelector('p').textContent = 'DNA Profile Loaded - Upload Another Design';

        console.log('UI updated with imported DNA');

    } catch (error) {
        console.error('Error updating UI with imported DNA:', error);
        showError('Failed to apply imported DNA profile.');
    }
}
