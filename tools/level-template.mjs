// Experimental matcher for white digits with a dark outline in support-card screenshots.
const SIZE = 24;
const PADDING = 2;
const MAX_SHIFT = 1;
const SEGMENTATIONS = [{ minimum: 175, chroma: 55 }, { minimum: 195, chroma: 50 }];

function canvas(width, height) {
  const node = document.createElement("canvas");
  node.width = width;
  node.height = height;
  return node;
}

function components(canvasImage, region, mask) {
  const { x, y, w, h } = region;
  const rgba = canvasImage.getContext("2d").getImageData(x, y, w, h).data;
  const pixels = new Uint8Array(w * h);
  for (let i = 0; i < pixels.length; i++) {
    const k = i * 4;
    const min = Math.min(rgba[k], rgba[k + 1], rgba[k + 2]);
    const max = Math.max(rgba[k], rgba[k + 1], rgba[k + 2]);
    pixels[i] = min >= mask.minimum && max - min <= mask.chroma;
  }
  const shapes = [];
  for (let i = 0; i < pixels.length; i++) {
    if (!pixels[i]) continue;
    pixels[i] = 0;
    const queue = [i];
    const bounds = { left: w, top: h, right: 0, bottom: 0 };
    for (let head = 0; head < queue.length; head++) {
      const pixel = queue[head], px = pixel % w, py = Math.floor(pixel / w);
      bounds.left = Math.min(bounds.left, px);
      bounds.right = Math.max(bounds.right, px);
      bounds.top = Math.min(bounds.top, py);
      bounds.bottom = Math.max(bounds.bottom, py);
      for (const neighbor of [px > 0 ? pixel - 1 : -1, px < w - 1 ? pixel + 1 : -1, pixel - w, pixel + w]) {
        if (!pixels[neighbor]) continue;
        pixels[neighbor] = 0;
        queue.push(neighbor);
      }
    }
    shapes.push({ ...bounds, queue, stride: w });
  }
  return shapes;
}

function normalize(shape) {
  const { left, top, right, bottom, queue, stride } = shape;
  const w = right - left + 1, h = bottom - top + 1;
  const mask = canvas(w, h), ctx = mask.getContext("2d");
  const image = ctx.createImageData(w, h);
  for (const point of queue) {
    const x = point % stride - left, y = Math.floor(point / stride) - top;
    image.data[(y * w + x) * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const scaled = canvas(SIZE, SIZE), out = scaled.getContext("2d");
  // Preserve relative glyph widths: a thin 1 must not look like a wide digit.
  const scale = Math.min((SIZE - PADDING * 2) / w, (SIZE - PADDING * 2) / h);
  out.drawImage(mask, (SIZE - w * scale) / 2, (SIZE - h * scale) / 2, w * scale, h * scale);
  return out.getImageData(0, 0, SIZE, SIZE).data.filter((_, i) => i % 4 === 3);
}

export function buildTemplates(samples) {
  const templates = new Map();
  for (const { digit, image, region } of samples) {
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;
    const shapes = components(image, region, SEGMENTATIONS[0]);
    const shape = shapes.sort((a, b) => b.queue.length - a.queue.length)[0];
    if (!shape || shape.queue.length < 15) continue;
    if (!templates.has(digit)) templates.set(digit, []);
    templates.get(digit).push(normalize(shape));
  }
  return templates;
}

function similarity(a, b) {
  let best = 0;
  const total = a.reduce((sum, pixel) => sum + pixel, 0) + b.reduce((sum, pixel) => sum + pixel, 0);
  for (let dy = -MAX_SHIFT; dy <= MAX_SHIFT; dy++) {
    for (let dx = -MAX_SHIFT; dx <= MAX_SHIFT; dx++) {
      let intersection = 0;
      for (let y = Math.max(0, -dy); y < Math.min(SIZE, SIZE - dy); y++) {
        for (let x = Math.max(0, -dx); x < Math.min(SIZE, SIZE - dx); x++) {
          intersection += Math.min(a[y * SIZE + x], b[(y + dy) * SIZE + x + dx]);
        }
      }
      best = Math.max(best, 2 * intersection / total);
    }
  }
  return best;
}

function findDigits(tile, mask) {
  const { width: w, height: h } = tile;
  const region = { x: 0, y: Math.floor(h * .64), w: Math.ceil(w * .225), h: Math.floor(h * .32) };
  return components(tile, region, mask).filter(shape => {
    const width = shape.right - shape.left + 1, height = shape.bottom - shape.top + 1;
    const baseline = (region.y + shape.bottom) / h;
    return width >= w * .035 && width <= w * .11 &&
      height >= h * .13 && height <= h * .24 &&
      baseline >= .83 && baseline <= .94 && shape.queue.length >= w * h * .002;
  }).sort((a, b) => a.left - b.left);
}

export function matchLevel(tile, templates, { minimum = .82, margin = .07 } = {}) {
  const candidates = new Map();
  for (const mask of SEGMENTATIONS) {
    const shapes = findDigits(tile, mask);
    if (!shapes.length || shapes.length > 2 || shapes[0].left > tile.width * .09) continue;
    if (shapes.length === 2 && (shapes[1].left < tile.width * .09 ||
        Math.abs(shapes[0].bottom - shapes[1].bottom) > tile.height * .035)) continue;
    // A lone left glyph in a two-digit slot can be a clipped tens digit. Require
    // that the right slot has no digit-sized foreground before accepting one.
    if (shapes.length === 1) {
      const { width, height } = tile, x = Math.round(width * .11), y = Math.round(height * .72);
      const rightShapes = components(tile, { x, y, w: Math.round(width * .105), h: Math.round(height * .19) }, mask);
      if (rightShapes.some(shape => shape.queue.length >= width * height * .002)) continue;
    }
    const scores = shapes.map(shape => {
      const glyph = normalize(shape);
      return new Map(Array.from(templates, ([digit, library]) =>
        [String(digit), Math.max(...library.map(reference => similarity(glyph, reference)))]));
    });
    for (let value = 1; value <= 60; value++) {
      const digits = String(value).split("");
      if (digits.length !== scores.length || !digits.every((digit, i) => scores[i].has(digit))) continue;
      const score = Math.min(...digits.map((digit, i) => scores[i].get(digit)));
      candidates.set(value, Math.max(score, candidates.get(value) || 0));
    }
  }
  const [first, second] = Array.from(candidates, ([value, score]) => ({ value, score }))
    .sort((a, b) => b.score - a.score);
  const gap = first && second ? first.score - second.score : 0;
  const value = first && first.score >= minimum && gap >= margin ? first.value : null;
  return { value, best: first?.value ?? null, similarity: first?.score ?? 0, gap };
}
