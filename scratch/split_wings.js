import sharp from 'sharp';
import path from 'path';

const assetsDir = path.resolve('public/assets/expedition');

async function splitImage(filename, baseName) {
  const inputPath = path.join(assetsDir, filename);
  const metadata = await sharp(inputPath).metadata();
  const { width, height } = metadata;
  const halfWidth = Math.floor(width / 2);

  console.log(`Processing ${filename}: ${width}x${height} -> each half is ~${halfWidth}x${height}`);

  // Extract left half
  const leftPath = path.join(assetsDir, `${baseName}_left.png`);
  await sharp(inputPath)
    .extract({ left: 0, top: 0, width: halfWidth, height })
    .toFile(leftPath);
  console.log(`Saved left: ${leftPath}`);

  // Extract right half
  const rightWidth = width - halfWidth;
  const rightPath = path.join(assetsDir, `${baseName}_right.png`);
  await sharp(inputPath)
    .extract({ left: halfWidth, top: 0, width: rightWidth, height })
    .toFile(rightPath);
  console.log(`Saved right: ${rightPath}`);
}

async function main() {
  try {
    await splitImage('echo_boss_wings_slam.png', 'echo_boss_wings_slam');
    await splitImage('echo_boss_wings_strike.png', 'echo_boss_wings_strike');
    console.log('Successfully split both images into left and right halves!');
  } catch (err) {
    console.error('Error splitting images:', err);
  }
}

main();
