const fs = require('fs');
const path = require('path');

const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(pngBase64, 'base64');

const publicDir = path.join(__dirname, 'client', 'public');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), buffer);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buffer);

const manifestPath = path.join(publicDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest.icons = [
  {
    "src": "/icon-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any maskable"
  },
  {
    "src": "/icon-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any maskable"
  }
];

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Icons generated and manifest updated.');
