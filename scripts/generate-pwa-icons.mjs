import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = process.argv[2]
  ? join(process.cwd(), process.argv[2])
  : join(ROOT, "logo-final.png");
const PUBLIC_DIR = join(ROOT, "public");
const ICONS_DIR = join(PUBLIC_DIR, "icons");

const BACKGROUND = { r: 253, g: 252, b: 251, alpha: 1 };

const PNG_TARGETS = [
  { fileName: "icon-16.png", size: 16, directory: ICONS_DIR, maskable: false },
  { fileName: "icon-32.png", size: 32, directory: ICONS_DIR, maskable: false },
  { fileName: "icon-96.png", size: 96, directory: ICONS_DIR, maskable: false },
  { fileName: "apple-touch-icon.png", size: 180, directory: PUBLIC_DIR, maskable: false },
  { fileName: "icon-192.png", size: 192, directory: ICONS_DIR, maskable: false },
  { fileName: "icon-512.png", size: 512, directory: ICONS_DIR, maskable: false },
  { fileName: "icon-192-maskable.png", size: 192, directory: ICONS_DIR, maskable: true },
  { fileName: "icon-512-maskable.png", size: 512, directory: ICONS_DIR, maskable: true }
];

const FAVICON_SIZES = [16, 32, 48];

async function createSquareIcon(size, maskable) {
  const contentRatio = maskable ? 0.72 : 0.88;
  const innerSize = Math.max(1, Math.round(size * contentRatio));
  const padding = Math.round((size - innerSize) / 2);

  return sharp(SOURCE)
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: BACKGROUND
    })
    .extend({
      top: padding,
      bottom: size - innerSize - padding,
      left: padding,
      right: size - innerSize - padding,
      background: BACKGROUND
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`No se encontró la imagen fuente: ${SOURCE}`);
    console.error("Coloca 'logo-final.png' en la raíz del proyecto y vuelve a ejecutar npm run generate:icons");
    process.exit(1);
  }

  mkdirSync(ICONS_DIR, { recursive: true });

  const metadata = await sharp(SOURCE).metadata();
  console.log(`Fuente: logo-final.png (${metadata.width}x${metadata.height})`);

  const faviconBuffers = [];

  for (const target of PNG_TARGETS) {
    const buffer = await createSquareIcon(target.size, target.maskable);
    const outputPath = join(target.directory, target.fileName);
    writeFileSync(outputPath, buffer);
    console.log(`Generado: ${outputPath.replace(ROOT, "").replace(/\\/g, "/")}`);
  }

  for (const size of FAVICON_SIZES) {
    faviconBuffers.push(await createSquareIcon(size, false));
  }

  const faviconBuffer = await toIco(faviconBuffers);
  const faviconPath = join(PUBLIC_DIR, "favicon.ico");
  writeFileSync(faviconPath, faviconBuffer);
  console.log("Generado: /public/favicon.ico");

  console.log("\nIconos PWA generados correctamente.");
}

main().catch((error) => {
  console.error("Error generando iconos:", error);
  process.exit(1);
});
