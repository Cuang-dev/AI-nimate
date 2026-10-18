const sharp = require('sharp');
const fs = require('fs');

/**
 * Remove flat or gradient off-white/cream backgrounds from spot illustrations
 * using boundary-seeded BFS flood-fill.
 * 
 * Preserves all interior colors, inks, fills, and black contours.
 */
async function removeBackgroundFloodFill(inputPath, outputPath, tolerance = 40) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels; // 4 (RGBA)

  // Sample perimeter corner colors
  const corners = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [4, 4], [width - 5, 4], [4, height - 5], [width - 5, height - 5]
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  for (const [cx, cy] of corners) {
    const idx = (cy * width + cx) * channels;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR /= corners.length;
  bgG /= corners.length;
  bgB /= corners.length;

  const visited = new Uint8Array(width * height);
  const queue = [];

  function isSimilar(idx) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    return dist <= tolerance;
  }

  // Seed with all perimeter pixels
  for (let x = 0; x < width; x++) {
    const topIdx = 0 * width + x;
    if (!visited[topIdx] && isSimilar(topIdx * channels)) {
      visited[topIdx] = 1;
      queue.push(topIdx);
    }
    const btmIdx = (height - 1) * width + x;
    if (!visited[btmIdx] && isSimilar(btmIdx * channels)) {
      visited[btmIdx] = 1;
      queue.push(btmIdx);
    }
  }
  for (let y = 0; y < height; y++) {
    const lIdx = y * width + 0;
    if (!visited[lIdx] && isSimilar(lIdx * channels)) {
      visited[lIdx] = 1;
      queue.push(lIdx);
    }
    const rIdx = y * width + width - 1;
    if (!visited[rIdx] && isSimilar(rIdx * channels)) {
      visited[rIdx] = 1;
      queue.push(rIdx);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1,
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1
    ];

    for (const n of neighbors) {
      if (n !== -1 && !visited[n] && isSimilar(n * channels)) {
        visited[n] = 1;
        queue.push(n);
      }
    }
  }

  // Set alpha of background pixels to 0
  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) {
      data[i * channels + 3] = 0;
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  return outputPath;
}

module.exports = {
  removeBackgroundFloodFill
};
