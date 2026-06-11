/**
 * Deterministic 9:16 poster frames as inline SVG data URIs so the gallery has
 * real visuals with zero binary assets checked in. In real mode these are
 * replaced by signed R2 URLs to {n}_thumb.jpg.
 */

const GRADIENTS: [string, string][] = [
  ["#6d5efc", "#1c2236"],
  ["#f43f5e", "#1c2236"],
  ["#22d3ee", "#0b0f1a"],
  ["#f59e0b", "#1c2236"],
  ["#a855f7", "#0b0f1a"],
  ["#10b981", "#0b0f1a"],
  ["#3b82f6", "#1c2236"],
  ["#ec4899", "#0b0f1a"],
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build a 1080x1920 poster data URI with a hook line and rank badge. */
export function posterDataUri(rank: number, label: string, score: number): string {
  const [from, to] = GRADIENTS[(rank - 1) % GRADIENTS.length]!;
  const words = label.split(/\s+/).slice(0, 8);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 16) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);

  const tspans = lines
    .slice(0, 4)
    .map(
      (l, i) =>
        `<tspan x="60" dy="${i === 0 ? 0 : 96}">${escapeXml(l.toUpperCase())}</tspan>`,
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="${to}"/>
  <rect width="1080" height="1920" fill="url(#g)" opacity="0.85"/>
  <circle cx="540" cy="620" r="260" fill="#ffffff" opacity="0.08"/>
  <circle cx="200" cy="1500" r="180" fill="#ffffff" opacity="0.06"/>
  <text x="60" y="1180" font-family="Inter, Arial, sans-serif" font-size="88" font-weight="800" fill="#ffffff" stroke="#000000" stroke-width="4" paint-order="stroke">${tspans}</text>
  <rect x="60" y="80" rx="20" ry="20" width="220" height="96" fill="#000000" opacity="0.55"/>
  <text x="170" y="146" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="800" fill="#FFE600">${score}</text>
  <rect x="780" y="1760" rx="16" ry="16" width="240" height="80" fill="#000000" opacity="0.55"/>
  <text x="900" y="1814" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="40" font-weight="700" fill="#ffffff">9:16</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
