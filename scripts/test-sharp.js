const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

console.log('Testing Sharp...');
console.log('Source:', process.argv[2] || 'GATEWAY/logo.png');
console.log('Output:', process.argv[3] || 'public');

const sourcePath = process.argv[2] || 'GATEWAY/logo.png';
const outputDir = process.argv[3] || 'public';

if (!fs.existsSync(sourcePath)) {
  console.error('Source file not found:', sourcePath);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [192, 512];
console.log('\nGenerating icons...');

(async () => {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    try {
      await sharp(sourcePath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 30, g: 64, b: 175, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Error generating icon-${size}x${size}.png:`, error.message);
    }
  }
  console.log('\nDone!');
})();

