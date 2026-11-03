/**
 * Builds the icon set and the default share image from the logo.
 *
 *   npm run icons
 *
 * Source: `public/brand/proc-robot-head.png` (512×512, transparent). A vector
 * (SVG) master would be better for the favicon sizes and is on the to-do list
 * (TASKS.md TP.16); re-run this script once it lands — nothing else changes.
 *
 * Outputs (all committed):
 *   src/app/favicon.ico     16 + 32 + 48, PNG-encoded inside the ICO container
 *   src/app/icon.png        192, transparent — tabs and Android
 *   src/app/apple-icon.png  180, opaque on navy — iOS composites transparency on black
 *   public/icon-192.png     referenced by src/app/manifest.ts
 *   public/icon-512.png     manifest + the Organization logo in the JSON-LD
 *   public/og-default.png   1200×630 sitewide share card (src/lib/seo/metadata.ts)
 */

import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "public/brand/proc-robot-head.png");

/** Theme tokens (design/THEME.md). */
const INK = { r: 0x12, g: 0x24, b: 0x2e }; // pr-ink — dark backdrop
const CREAM = "#F7F5F0"; // pr-bg
const INK_HEX = "#12242E";
const ACCENT_HEX = "#0F6B57"; // pr-accent
const SECONDARY_HEX = "#5C6A6E"; // pr-text-secondary

/** The mark at `size`, optionally padded and flattened onto the navy backdrop. */
async function render(size: number, opaque: boolean): Promise<Buffer> {
  if (!opaque) {
    return sharp(SOURCE)
      .resize(size, size, { kernel: "lanczos3" })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  // iOS rounds the corners itself; ~12% padding keeps the head clear of them.
  const inner = Math.round(size * 0.76);
  const mark = await sharp(SOURCE).resize(inner, inner, { kernel: "lanczos3" }).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: { ...INK, alpha: 1 } },
  })
    .composite([{ input: mark, gravity: "center" }])
    .flatten({ background: INK })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * The 1200×630 share card: cream background, the head on the left, the
 * wordmark and tagline on the right.
 *
 * The text is SVG rendered by librsvg with system fonts, so the serif falls
 * back to Georgia where Newsreader is not installed — close enough for a
 * share card, and it keeps the script dependency-free.
 */
async function ogImage(): Promise<Buffer> {
  const W = 1200;
  const H = 630;
  const markSize = 300;
  const mark = await sharp(SOURCE).resize(markSize, markSize, { kernel: "lanczos3" }).png().toBuffer();

  const text = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <text x="470" y="292" font-family="Newsreader, Georgia, 'Times New Roman', serif"
            font-size="92" font-weight="500" fill="${INK_HEX}">Proc-Robot</text>
      <rect x="474" y="324" width="96" height="5" fill="${ACCENT_HEX}" />
      <text x="472" y="392" font-family="'Public Sans', 'Helvetica Neue', Arial, sans-serif"
            font-size="36" fill="${SECONDARY_HEX}">From specification to quotation.</text>
    </svg>`);

  return sharp({ create: { width: W, height: H, channels: 3, background: CREAM } })
    .composite([
      { input: mark, left: 120, top: Math.round((H - markSize) / 2) },
      { input: text, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * A PNG-in-ICO container.
 *
 * sharp has no ICO encoder, but the format is a 6-byte header, a 16-byte
 * directory entry per image, and the image payloads — and every browser that
 * still asks for `/favicon.ico` accepts PNG payloads. Writing it directly beats
 * adding a dependency for 40 lines of struct packing.
 */
function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries: Buffer[] = [];

  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    // 0 means 256 in this field; every size we emit is smaller than that.
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette colours (0 = truecolour)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

function report(file: string, detail: string, bytes: number) {
  console.log(`${file.padEnd(26)} ${detail.padEnd(12)} ${(bytes / 1024).toFixed(1)} KB`);
}

async function main() {
  const targets: [file: string, size: number, opaque: boolean][] = [
    ["src/app/icon.png", 192, false],
    ["src/app/apple-icon.png", 180, true],
    ["public/icon-192.png", 192, false],
    ["public/icon-512.png", 512, false],
  ];

  for (const [file, size, opaque] of targets) {
    const png = await render(size, opaque);
    await writeFile(path.join(ROOT, file), png);
    report(file, `${size}px`, png.length);
  }

  const sizes = [16, 32, 48];
  const pngs = await Promise.all(
    sizes.map(async (size) => ({ size, png: await render(size, false) })),
  );
  const bytes = ico(pngs);
  await writeFile(path.join(ROOT, "src/app/favicon.ico"), bytes);
  report("src/app/favicon.ico", sizes.join("+"), bytes.length);

  const og = await ogImage();
  await writeFile(path.join(ROOT, "public/og-default.png"), og);
  report("public/og-default.png", "1200x630", og.length);
}

void main();
