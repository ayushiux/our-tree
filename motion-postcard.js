import { GIFEncoder, quantize, applyPalette } from './vendor/gifenc.js';
import { renderPostcardCanvas } from './postcard.js';

export async function renderAnimatedPostcard(scene, card, onProgress, signal) {
  const width = 900, height = 600, frameCount = 100, delay = 80, start = scene.state().angle, greeting = { ...card };
  const check = () => { if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError'); };
  const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));
  const draw = frame => renderPostcardCanvas(scene, greeting, {
    width, height, rotation: start + frame / frameCount * Math.PI * 2,
    phase: frame / frameCount * Math.PI * 6
  });
  const sampleFrames = [0, 25, 50, 75], samples = new Map(), palettePixels = new Uint8Array(width * height * 4 * sampleFrames.length);
  for (const [i, frame] of sampleFrames.entries()) {
    check(); const canvas = await draw(frame); samples.set(frame, canvas);
    palettePixels.set(canvas.getContext('2d').getImageData(0, 0, width, height).data, i * width * height * 4);
    await yieldFrame();
  }
  check(); const palette = quantize(palettePixels, 256, { format: 'rgb565' });
  const gif = GIFEncoder();
  let stillIndex;
  for (let frame = 0; frame < frameCount; frame++) {
    check(); const canvas = samples.get(frame) || await draw(frame);
    const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    const index = applyPalette(data, palette, 'rgb565');
    if (!stillIndex) stillIndex = index.slice();
    else {
      // Quantized colour buckets can otherwise vary with the moving tree.
      // Preserve the greeting, frame and caption as exact first-frame pixels.
      for (let row = 0; row < height; row++) {
        const offset = row * width;
        if (row < 34 || row >= 523) index.set(stillIndex.subarray(offset, offset + width), offset);
        else {
          index.set(stillIndex.subarray(offset, offset + 28), offset);
          index.set(stillIndex.subarray(offset + 395, offset + width), offset + 395);
        }
      }
    }
    gif.writeFrame(index, width, height, { palette: frame === 0 ? palette : undefined, delay, repeat: 0 });
    onProgress?.((frame + 1) / frameCount); await yieldFrame();
  }
  check(); gif.finish();
  return { blob: new Blob([gif.bytes()], { type: 'image/gif' }), width, height, frames: frameCount, duration: frameCount * delay / 1000 };
}
