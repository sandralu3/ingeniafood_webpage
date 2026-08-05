import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");

/**
 * Badge Android (barra de estado): solo silueta blanca + alpha.
 * Fondo crema/opaco se ve como cuadrado blanco sólido.
 */
const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <g fill="#ffffff" transform="translate(20 16) scale(2.35)">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12c0 0-1.2 2.2-3.4 3.6C6.8 17.1 4.2 18.5 2 21Z"/>
  </g>
</svg>`;

/**
 * Icono de la notificación expandida: logo verde sobre transparente
 * (sin fondo crema, para que Android no lo aplane a un bloque blanco).
 */
const colorIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <g fill="none" stroke="#556B2F" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" transform="translate(28 24) scale(5.6)">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </g>
</svg>`;

const badge = await sharp(Buffer.from(badgeSvg), { density: 180 }).png().toBuffer();
writeFileSync(join(iconsDir, "notification-badge.png"), badge);

const icon = await sharp(Buffer.from(colorIconSvg), { density: 180 }).png().toBuffer();
writeFileSync(join(iconsDir, "notification-icon.png"), icon);

const badgeMeta = await sharp(badge).metadata();
const iconMeta = await sharp(icon).metadata();
const iconStats = await sharp(icon).stats();

console.log("badge", { hasAlpha: badgeMeta.hasAlpha, size: badge.length });
console.log("icon", {
  hasAlpha: iconMeta.hasAlpha,
  isOpaque: iconStats.isOpaque,
  size: icon.length
});
