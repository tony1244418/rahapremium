/**
 * Icon Generator Script for PWA
 * 
 * This script generates all required PWA icons from a source logo.
 * 
 * Requirements:
 * - Node.js
 * - Sharp package: npm install sharp
 * 
 * Usage:
 * node scripts/generate-icons.js [source-image] [output-dir]
 * 
 * Example:
 * node scripts/generate-icons.js GATEWAY/logo.png public
 */

const fs = require('fs');
const path = require('path');

// Icon sizes required for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons(sourcePath, outputDir = 'public') {
  try {
    // Check if Sharp is available
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      console.error('❌ Sharp package not found. Please install it first:');
      console.error('   npm install sharp');
      console.error('\nAlternatively, use an online tool like:');
      console.error('   https://realfavicongenerator.net/');
      console.error('   https://www.pwabuilder.com/imageGenerator');
      process.exit(1);
    }

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source file not found: ${sourcePath}`);
      process.exit(1);
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✅ Created directory: ${outputDir}`);
    }

    console.log(`📸 Generating icons from: ${sourcePath}`);
    console.log(`📁 Output directory: ${outputDir}\n`);

    // Generate each icon size
    for (const size of ICON_SIZES) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      try {
        await sharp(sourcePath)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 30, g: 64, b: 175, alpha: 1 } // Primary blue background
          })
          .png()
          .toFile(outputPath);
        
        console.log(`✅ Generated: icon-${size}x${size}.png`);
      } catch (error) {
        console.error(`❌ Failed to generate icon-${size}x${size}.png:`, error.message);
      }
    }

    // Also copy/create logo.png if it doesn't exist
    const logoPath = path.join(outputDir, 'logo.png');
    if (!fs.existsSync(logoPath)) {
      try {
        await sharp(sourcePath)
          .resize(512, 512, {
            fit: 'contain',
            background: { r: 30, g: 64, b: 175, alpha: 1 }
          })
          .png()
          .toFile(logoPath);
        console.log(`✅ Generated: logo.png`);
      } catch (error) {
        console.error(`❌ Failed to generate logo.png:`, error.message);
      }
    }

    console.log('\n✨ Icon generation complete!');
    console.log('\nNext steps:');
    console.log('1. Verify icons in the', outputDir, 'folder');
    console.log('2. Test PWA installation in Chrome/Edge');
    console.log('3. Check browser DevTools > Application > Manifest');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const sourcePath = process.argv[2] || 'GATEWAY/logo.png';
const outputDir = process.argv[3] || 'public';

// Run the generator
generateIcons(sourcePath, outputDir);

