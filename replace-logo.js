const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = 'public/20251124_105924.png';
const outputDir = 'public';

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function replaceAllIcons() {
  try {
    console.log('🔄 Replacing all logos and icons...');
    console.log(`📸 Source image: ${sourceImage}`);
    console.log(`📁 Output directory: ${outputDir}\n`);

    // Check if source exists
    if (!fs.existsSync(sourceImage)) {
      console.error(`❌ Source file not found: ${sourceImage}`);
      process.exit(1);
    }

    // Generate all icon sizes
    console.log('Generating PWA icons...');
    for (const size of iconSizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      try {
        await sharp(sourceImage)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 30, g: 64, b: 175, alpha: 1 }
          })
          .png()
          .toFile(outputPath);
        console.log(`✅ Generated: icon-${size}x${size}.png`);
      } catch (error) {
        console.error(`❌ Failed to generate icon-${size}x${size}.png:`, error.message);
      }
    }

    // Generate logo.png (512x512)
    const logoPath = path.join(outputDir, 'logo.png');
    try {
      await sharp(sourceImage)
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

    console.log('\n✨ All icons and logos replaced successfully!');
    console.log('\nFiles generated:');
    console.log('- logo.png (favicon)');
    iconSizes.forEach(size => {
      console.log(`- icon-${size}x${size}.png`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

replaceAllIcons();








