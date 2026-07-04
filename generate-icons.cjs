const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgFile = fs.readFileSync('public/logo.svg');
const iconsDir = path.join(__dirname, 'public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [120, 152, 167, 180, 192, 512, 1024];

async function generate() {
  for (const size of sizes) {
    await sharp(svgFile)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
}

generate().catch(console.error);
