const sharp = require('sharp');
const path = require('path');

const srcImage = 'C:\\Users\\naveenkumar.gs_istee\\.gemini\\antigravity-ide\\brain\\b46b4cc4-8dad-4273-a827-89725c0ce420\\app_icon_1790059685532.jpg';
const dest192 = path.join(__dirname, 'public', 'icon-192.png');
const dest512 = path.join(__dirname, 'public', 'icon-512.png');

async function resize() {
  await sharp(srcImage).resize(192, 192).toFile(dest192);
  await sharp(srcImage).resize(512, 512).toFile(dest512);
  console.log('Icons generated successfully.');
}

resize().catch(console.error);
