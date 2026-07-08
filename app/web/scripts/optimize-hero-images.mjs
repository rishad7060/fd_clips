// One-off: shrink the oversized hero podcast JPEGs (900x1600, ~880 KiB total)
// to WebP at 2x their displayed size (560x996) for retina crispness. Cuts the
// hero payload ~85% and fixes the LCP regression. Writes .webp alongside the
// originals; the page markup switches to the .webp files.
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "podcast");
// Displayed at 280x498; 2x = 560x996 covers retina. Portrait 9:16-ish.
const W = 560;
const H = 996;

const files = (await readdir(dir)).filter((f) => /^podcaster-\d+\.jpg$/.test(f));
for (const f of files) {
  const src = path.join(dir, f);
  const out = path.join(dir, f.replace(/\.jpg$/, ".webp"));
  const info = await sharp(src)
    .resize(W, H, { fit: "cover", position: "attention" })
    .webp({ quality: 72 })
    .toFile(out);
  console.log(`${f} -> ${path.basename(out)}  ${(info.size / 1024).toFixed(1)} KiB (${info.width}x${info.height})`);
}
console.log("done");
