const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const { extractColorDNA } = require('./lib/colorAnalysis');
const { extractSpatialDNA } = require('./lib/spatialAnalysis');

// Create Express app
const app = express();

// Define PORT
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Configure multer for in-memory file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

/**
 * Typography DNA extraction function (demo version with predefined profiles)
 * @param {string} designIdentifier - Filename or design identifier
 * @returns {Object} Typography DNA object
 */
function getTypographyDNA(designIdentifier) {
    // Convert filename to lowercase for matching
    const identifier = designIdentifier.toLowerCase();
    
    console.log('Typography DNA - Processing identifier:', identifier);
    
    switch (true) {
        // Minimalist designs
        case identifier.includes('minimal') || identifier.includes('clean') || identifier.includes('modern'):
            console.log('Typography DNA - Matched: minimalist');
            return {
                fontPairing: {
                    heading: "'Inter', 'Helvetica Neue', sans-serif",
                    body: "'Inter', 'Helvetica Neue', sans-serif"
                },
                sizeHierarchy: {
                    base: 16,
                    h2Ratio: 1.75
                },
                weightRelationships: {
                    heading: 700,
                    body: 400
                },
                letterSpacing: 'normal',
                style: 'minimalist'
            };
            
        // Traditional/Formal designs
        case identifier.includes('formal') || identifier.includes('traditional') || identifier.includes('classic') || identifier.includes('license') || identifier.includes('document'):
            console.log('Typography DNA - Matched: traditional');
            return {
                fontPairing: {
                    heading: "'Georgia', 'Times New Roman', serif",
                    body: "'Georgia', 'Times New Roman', serif"
                },
                sizeHierarchy: {
                    base: 14,
                    h2Ratio: 1.5
                },
                weightRelationships: {
                    heading: 600,
                    body: 400
                },
                letterSpacing: '0.025em',
                style: 'traditional'
            };
            
        // Creative/Artistic designs
        case identifier.includes('creative') || identifier.includes('art') || identifier.includes('design') || identifier.includes('colorful') || identifier.includes('autumn') || identifier.includes('vibrant'):
            console.log('Typography DNA - Matched: creative');
            return {
                fontPairing: {
                    heading: "'Poppins', 'Montserrat', sans-serif",
                    body: "'Open Sans', 'Lato', sans-serif"
                },
                sizeHierarchy: {
                    base: 18,
                    h2Ratio: 2.0
                },
                weightRelationships: {
                    heading: 800,
                    body: 400
                },
                letterSpacing: '0.05em',
                style: 'creative'
            };
            
        // Tech/Corporate designs
        case identifier.includes('tech') || identifier.includes('corporate') || identifier.includes('business') || identifier.includes('professional'):
            console.log('Typography DNA - Matched: corporate');
            return {
                fontPairing: {
                    heading: "'Roboto', 'Arial', sans-serif",
                    body: "'Roboto', 'Arial', sans-serif"
                },
                sizeHierarchy: {
                    base: 15,
                    h2Ratio: 1.6
                },
                weightRelationships: {
                    heading: 500,
                    body: 300
                },
                letterSpacing: '0.01em',
                style: 'corporate'
            };
            
        // Playful/Fun designs
        case identifier.includes('fun') || identifier.includes('playful') || identifier.includes('kids') || identifier.includes('cartoon'):
            console.log('Typography DNA - Matched: playful');
            return {
                fontPairing: {
                    heading: "'Nunito', 'Comic Neue', sans-serif",
                    body: "'Nunito', 'Comic Neue', sans-serif"
                },
                sizeHierarchy: {
                    base: 17,
                    h2Ratio: 2.2
                },
                weightRelationships: {
                    heading: 900,
                    body: 400
                },
                letterSpacing: '0.02em',
                style: 'playful'
            };
            
        // Default fallback
        default:
            console.log('Typography DNA - Matched: default');
            return {
                fontPairing: {
                    heading: "'System UI', '-apple-system', sans-serif",
                    body: "'System UI', '-apple-system', sans-serif"
                },
                sizeHierarchy: {
                    base: 16,
                    h2Ratio: 1.5
                },
                weightRelationships: {
                    heading: 600,
                    body: 400
                },
                letterSpacing: 'normal',
                style: 'default'
            };
    }
}

/**
 * Helper function to convert image buffer to ImageData-like object using Sharp
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} ImageData-like object with data, width, height
 */
async function bufferToImageData(imageBuffer) {
    try {
        // Use Sharp to process the image and get raw pixel data
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        
        // Convert to raw RGB data
        const { data, info } = await image
            .raw()
            .ensureAlpha() // Ensure we have RGBA data
            .toBuffer({ resolveWithObject: true });
        
        return {
            data: data, // Uint8Array of RGBA values
            width: info.width,
            height: info.height
        };
    } catch (error) {
        throw new Error(`Failed to process image data: ${error.message}`);
    }
}

/**
 * Helper function to determine overall design style
 * @param {Object} colorDNA - Color analysis results
 * @param {Object} spatialDNA - Spatial analysis results
 * @param {Object} typographyDNA - Typography analysis results
 * @returns {string} Overall style description
 */
function determineOverallStyle(colorDNA, spatialDNA, typographyDNA) {
    const styles = [];
    
    // Color-based style indicators
    if (colorDNA.saturationProfile === 'vibrant') {
        styles.push('energetic');
    } else if (colorDNA.saturationProfile === 'muted') {
        styles.push('subtle');
    }
    
    if (colorDNA.brightnessProfile === 'dark') {
        styles.push('dramatic');
    } else if (colorDNA.brightnessProfile === 'light') {
        styles.push('airy');
    }
    
    // Spatial-based style indicators
    if (spatialDNA.usesGoldenRatio) {
        styles.push('harmonious');
    }
    
    if (spatialDNA.dominantAxisAlignment === 'centered') {
        styles.push('balanced');
    }
    
    // Typography-based style indicators
    if (typographyDNA && typographyDNA.style) {
        styles.push(typographyDNA.style);
    }
    
    // Check whitespace distribution for minimalist detection
    const totalWhitespace = Object.values(spatialDNA.whitespaceDistribution)
        .reduce((sum, val) => sum + val, 0);
    
    if (totalWhitespace > 0.4) {
        styles.push('spacious');
    } else if (totalWhitespace < 0.1) {
        styles.push('dense');
    }
    
    // Remove duplicates and return
    const uniqueStyles = [...new Set(styles)];
    return uniqueStyles.length > 0 ? uniqueStyles.join(', ') : 'neutral';
}

// API Routes

// Complete design DNA extraction endpoint
app.post('/api/extract', upload.single('image'), async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No image file provided',
                message: 'Please upload an image file'
            });
        }

        console.log('Processing image:', req.file.originalname);
        console.log('File size:', req.file.size, 'bytes');
        console.log('MIME type:', req.file.mimetype);
        
        // Extract color DNA from the image buffer
        console.log('Extracting color DNA...');
        const colorDNA = await extractColorDNA(req.file.buffer);
        
        // Convert image buffer to ImageData for spatial analysis
        console.log('Converting image to pixel data...');
        const imageData = await bufferToImageData(req.file.buffer);
        
        // Extract spatial DNA from the image data
        console.log('Extracting spatial DNA...');
        const spatialDNA = await extractSpatialDNA(imageData);
        
        // Extract typography DNA based on filename
        console.log('Extracting typography DNA...');
        const typographyDNA = getTypographyDNA(req.file.originalname);
        console.log('Typography DNA result:', typographyDNA);
        
        // Combine all analyses into a complete design DNA profile
        const designDNA = {
            metadata: {
                filename: req.file.originalname,
                filesize: req.file.size,
                mimetype: req.file.mimetype,
                dimensions: {
                    width: imageData.width,
                    height: imageData.height
                },
                timestamp: new Date().toISOString(),
                processingTime: Date.now() // Will be updated at the end
            },
            colorDNA: {
                primary: colorDNA.primary,
                palette: colorDNA.palette,
                dominantToSecondaryRelationship: colorDNA.dominantToSecondaryRelationship,
                saturationProfile: colorDNA.saturationProfile,
                brightnessProfile: colorDNA.brightnessProfile
            },
            spatialDNA: {
                whitespaceDistribution: spatialDNA.whitespaceDistribution,
                contentAspectRatio: spatialDNA.contentAspectRatio,
                usesGoldenRatio: spatialDNA.usesGoldenRatio,
                dominantAxisAlignment: spatialDNA.dominantAxisAlignment
            },
            typographyDNA: {
                fontPairing: typographyDNA.fontPairing,
                sizeHierarchy: typographyDNA.sizeHierarchy,
                weightRelationships: typographyDNA.weightRelationships,
                letterSpacing: typographyDNA.letterSpacing,
                style: typographyDNA.style
            },
            summary: {
                // Generate a human-readable summary
                colorDescription: `${colorDNA.saturationProfile} colors with ${colorDNA.brightnessProfile} brightness`,
                layoutDescription: `${spatialDNA.dominantAxisAlignment} alignment${spatialDNA.usesGoldenRatio ? ' using golden ratio' : ''}`,
                typographyDescription: `${typographyDNA.style} typography with ${typographyDNA.fontPairing.heading.split(',')[0].replace(/'/g, '')} headings`,
                dominantColorHex: colorDNA.primary.hex,
                hasBalancedWhitespace: Object.values(spatialDNA.whitespaceDistribution).every(val => val > 0.05),
                overallStyle: determineOverallStyle(colorDNA, spatialDNA, typographyDNA)
            }
        };
        
        // Update processing time
        designDNA.metadata.processingTime = Date.now() - designDNA.metadata.processingTime;
        
        console.log('Design DNA extraction completed successfully');
        console.log('Processing time:', designDNA.metadata.processingTime, 'ms');
        console.log('Final designDNA keys:', Object.keys(designDNA));
        console.log('Typography included:', !!designDNA.typographyDNA);
        
        // Send successful response
        res.json({
            success: true,
            designDNA
        });

    } catch (error) {
        console.error('Error extracting design DNA:', error);
        res.status(500).json({ 
            error: 'Failed to extract design DNA',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'DNA Fingerprinting API',
        version: '2.0.0',
        features: ['Color DNA', 'Spatial DNA', 'Typography DNA'],
        endpoints: {
            extract: 'POST /api/extract - Extract complete design DNA from image',
            health: 'GET /api/health - Service health check',
            docs: 'GET /api/docs - API documentation'
        }
    });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        service: 'Design DNA Extraction API',
        version: '2.0.0',
        description: 'Extract color, spatial, and typography DNA from design images',
        endpoints: {
            '/api/extract': {
                method: 'POST',
                description: 'Upload an image and extract its complete design DNA',
                parameters: {
                    image: 'Form field containing the image file (max 10MB)'
                },
                response: {
                    success: 'boolean',
                    designDNA: {
                        metadata: 'File and processing information',
                        colorDNA: 'Color analysis including palette and relationships',
                        spatialDNA: 'Layout analysis including whitespace and ratios',
                        typographyDNA: 'Font pairing and typography recommendations',
                        summary: 'Human-readable design insights'
                    }
                }
            },
            '/api/health': {
                method: 'GET',
                description: 'Check service health and status'
            }
        },
        supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        typographyProfiles: ['minimalist', 'traditional', 'creative', 'corporate', 'playful', 'default']
    });
});

// Serve the main app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'File too large',
                message: 'Maximum file size is 10MB',
                maxSize: '10MB'
            });
        }
        return res.status(400).json({ 
            error: 'File upload error',
            details: error.message 
        });
    }
    
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// Export the Express app for Vercel
module.exports = app;
