/**
 * Rigenera le icone PNG da public/icon.svg e public/icon-maskable.svg.
 * Le icone sono già versionate: serve solo se cambia il logo.
 *   npm i -D sharp && node scripts/build-icons.mjs
 */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const icon = readFileSync('public/icon.svg');
const maskable = readFileSync('public/icon-maskable.svg');

for (const size of [64, 128, 180, 192, 256, 512]) {
  await sharp(icon, { density: 600 }).resize(size, size).png().toFile(`public/icon-${size}.png`);
}
await sharp(maskable, { density: 600 })
  .resize(512, 512)
  .png()
  .toFile('public/icon-maskable-512.png');
await sharp(icon, { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(icon, { density: 600 }).resize(32, 32).png().toFile('public/favicon.png');

console.log('Icone rigenerate.');
