/* eslint-disable @typescript-eslint/no-require-imports */
// Script to generate extension icons
// Run with: node extension/generate-icons.js

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG icon with "S" on blue background
function createSvg(size) {
  const fontSize = Math.floor(size * 0.6);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#2563eb"/>
    <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-weight="700" font-size="${fontSize}px" fill="white">S</text>
  </svg>`;
}

async function generateIcons() {
  for (const size of sizes) {
    const svg = createSvg(size);
    const outputPath = path.join(iconsDir, `icon${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`Created ${outputPath}`);
  }
  console.log('All icons generated!');
}

generateIcons().catch(console.error);
