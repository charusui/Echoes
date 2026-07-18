const fs = require('fs');
const { PNG } = require('pngjs');

fs.createReadStream('assets/enemy_spritesheet.png')
  .pipe(new PNG())
  .on('parsed', function() {
    const cols = 5;
    const cellW = this.width / 5;
    const cellH = this.height / 2;
    const cropW = 180;
    const cropH = 175;
    const offsetX = 12;
    const offsetY = 12;

    for (let i = 0; i < 10; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const startX = Math.round(col * cellW) + offsetX;
      const startY = Math.round(row * cellH) + offsetY;

      const dst = new PNG({ width: cropW, height: cropH });
      for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
          const srcIdx = ((this.width * (startY + y)) + (startX + x)) << 2;
          const dstIdx = ((dst.width * y) + x) << 2;
          dst.data[dstIdx] = this.data[srcIdx];
          dst.data[dstIdx+1] = this.data[srcIdx+1];
          dst.data[dstIdx+2] = this.data[srcIdx+2];
          dst.data[dstIdx+3] = this.data[srcIdx+3];
        }
      }

      // Let's do a BFS flood fill from all 4 edges to make the background transparent
      // We start with all pixels on the top, left, and right edges (and bottom edge if it matches background)
      const visited = new Uint8Array(cropW * cropH);
      const queue = [];

      const isBackgroundPixel = (r, g, b) => {
        // Background in this sprite sheet is greyish-brown/neutral (approx 50-135 R,G,B with low saturation/difference)
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const diff = maxC - minC;
        // Check if it's relatively neutral grey/brownish background
        // And not bright character colors or dark outline (< 25 or > 180)
        return (diff < 28 && r >= 45 && r <= 145 && g >= 45 && g <= 145 && b >= 45 && b <= 145);
      };

      for (let x = 0; x < cropW; x++) {
        // top edge
        let idx = x << 2;
        if (isBackgroundPixel(dst.data[idx], dst.data[idx+1], dst.data[idx+2])) {
          queue.push(x, 0);
          visited[x] = 1;
        }
        // bottom edge
        let y = cropH - 1;
        idx = ((cropW * y) + x) << 2;
        if (isBackgroundPixel(dst.data[idx], dst.data[idx+1], dst.data[idx+2])) {
          queue.push(x, y);
          visited[cropW * y + x] = 1;
        }
      }
      for (let y = 0; y < cropH; y++) {
        // left edge
        let idx = (cropW * y) << 2;
        if (!visited[cropW * y] && isBackgroundPixel(dst.data[idx], dst.data[idx+1], dst.data[idx+2])) {
          queue.push(0, y);
          visited[cropW * y] = 1;
        }
        // right edge
        let x = cropW - 1;
        idx = ((cropW * y) + x) << 2;
        if (!visited[cropW * y + x] && isBackgroundPixel(dst.data[idx], dst.data[idx+1], dst.data[idx+2])) {
          queue.push(x, y);
          visited[cropW * y + x] = 1;
        }
      }

      let removedCount = 0;
      while (queue.length > 0) {
        const y = queue.pop();
        const x = queue.pop();
        const idx = ((cropW * y) + x) << 2;
        dst.data[idx+3] = 0; // set alpha = 0
        removedCount++;

        const neighbors = [
          [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];
        for (let [nx, ny] of neighbors) {
          if (nx >= 0 && nx < cropW && ny >= 0 && ny < cropH) {
            const nIndex = cropW * ny + nx;
            if (!visited[nIndex]) {
              const nIdx = nIndex << 2;
              const r = dst.data[nIdx];
              const g = dst.data[nIdx+1];
              const b = dst.data[nIdx+2];
              if (isBackgroundPixel(r, g, b)) {
                visited[nIndex] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }
      }

      if (i === 0) console.log(`Frame 0: flood fill removed ${removedCount} background pixels!`);
      fs.writeFileSync(`assets/enemy_frame_${i}.png`, PNG.sync.write(dst));
    }
    console.log('All 10 frames processed for background removal!');
  });
