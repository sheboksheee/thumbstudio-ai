/**
 * Browser-side export of a thumbnail to exactly 1280×720 (YouTube).
 * fit=cover crops (with an anchor), fit=contain letterboxes on black.
 */
export type ExportOptions = { format: "jpg" | "png"; fit: "cover" | "contain"; position: "centre" | "top" | "bottom" | "left" | "right" };

const W = 1280;
const H = 720;

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), type, quality));
}

export async function exportThumbnail(source: Blob, opts: ExportOptions): Promise<Blob> {
  const img = await loadImage(source);
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (opts.fit === "contain") {
    const s = Math.min(W / sw, H / sh);
    const dw = sw * s;
    const dh = sh * s;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const s = Math.max(W / sw, H / sh);
    const cw = W / s; // crop size in source pixels
    const ch = H / s;
    let sx = (sw - cw) / 2;
    let sy = (sh - ch) / 2;
    if (opts.position === "left") sx = 0;
    if (opts.position === "right") sx = sw - cw;
    if (opts.position === "top") sy = 0;
    if (opts.position === "bottom") sy = sh - ch;
    ctx.drawImage(img, sx, sy, cw, ch, 0, 0, W, H);
  }

  if (opts.format === "png") return toBlob(canvas, "image/png");
  // YouTube limit is 2 MB — step quality down if needed.
  for (const q of [0.93, 0.88, 0.82, 0.75]) {
    const b = await toBlob(canvas, "image/jpeg", q);
    if (b.size <= 2_000_000 || q === 0.75) return b;
  }
  return toBlob(canvas, "image/jpeg", 0.75);
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** ASCII-only file-name fragment (some browsers reject non-Latin download names). */
export function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
