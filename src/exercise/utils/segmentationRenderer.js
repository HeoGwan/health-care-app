export const MASK_WIDTH = 640;
export const MASK_HEIGHT = 360;

export const DEFAULT_MASK_OPTIONS = Object.freeze({
  threshold: 0.5,
  edgeCleanup: 0.8,
  temporalSmoothing: 0.35,
  feather: 0.25,
});

export function getContainRect(source, targetWidth, targetHeight) {
  const sourceWidth = source?.videoWidth || source?.width || targetWidth;
  const sourceHeight = source?.videoHeight || source?.height || targetHeight;
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

export function createMaskProcessor(width = MASK_WIDTH, height = MASK_HEIGHT) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  if (!context) return null;

  return {
    canvas,
    context,
    confidence: new Float32Array(width * height),
    binary: new Uint8Array(width * height),
    cleaned: new Uint8Array(width * height),
  };
}

export function resetMaskProcessor(processor) {
  if (!processor) return;
  processor.context.clearRect(0, 0, processor.canvas.width, processor.canvas.height);
  processor.confidence.fill(0);
  processor.binary.fill(0);
  processor.cleaned.fill(0);
}

function cleanBinaryMask(binary, cleaned, width, height) {
  cleaned.set(binary);
  for (let y = 1; y < height - 1; y += 1) {
    const row = y * width;
    for (let x = 1; x < width - 1; x += 1) {
      const index = row + x;
      let neighbours = 0;
      neighbours += binary[index - width - 1];
      neighbours += binary[index - width];
      neighbours += binary[index - width + 1];
      neighbours += binary[index - 1];
      neighbours += binary[index + 1];
      neighbours += binary[index + width - 1];
      neighbours += binary[index + width];
      neighbours += binary[index + width + 1];

      if (binary[index] && neighbours <= 1) cleaned[index] = 0;
      if (!binary[index] && neighbours >= 6) cleaned[index] = 1;
    }
  }
}

// Turns MediaPipe's soft confidence mask into a stable, mostly binary mask held in
// `processor.binary` / `processor.cleaned`. Returns the source rect inside the mask canvas and
// the scratch ImageData so callers can reuse the buffer.
function buildCleanMask(results, processor, settings) {
  if (!processor || !results?.image || !results.segmentationMask) {
    resetMaskProcessor(processor);
    return null;
  }

  const maskContext = processor.context;
  const width = processor.canvas.width;
  const height = processor.canvas.height;
  const rect = getContainRect(results.image, width, height);

  maskContext.save();
  maskContext.setTransform(1, 0, 0, 1, 0, 0);
  maskContext.globalCompositeOperation = "source-over";
  maskContext.filter = "none";
  maskContext.clearRect(0, 0, width, height);
  maskContext.imageSmoothingEnabled = true;
  maskContext.drawImage(results.segmentationMask, rect.x, rect.y, rect.width, rect.height);
  maskContext.restore();

  const imageData = maskContext.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const keepPrevious = Math.min(0.9, Math.max(0, settings.temporalSmoothing));
  const threshold = Math.min(0.9, Math.max(0.1, settings.threshold));

  for (let index = 0; index < processor.confidence.length; index += 1) {
    const pixelIndex = index * 4;
    const currentConfidence = Math.max(
      pixels[pixelIndex],
      pixels[pixelIndex + 1],
      pixels[pixelIndex + 2],
    ) / 255;
    const confidence =
      processor.confidence[index] * keepPrevious + currentConfidence * (1 - keepPrevious);
    processor.confidence[index] = confidence;
    processor.binary[index] = confidence >= threshold ? 1 : 0;
  }

  cleanBinaryMask(processor.binary, processor.cleaned, width, height);
  return { rect, imageData, width, height };
}

export const DISPLAY_MAX_DIMENSION = 1920;

// The canvas that reaches the screen is sized to the source, not to the inference resolution.
// Drawing a 1920-wide guide frame into a 640-wide buffer and then enlarging that buffer is what
// actually destroys the performer's detail — the enlargement itself costs far less.
export function matchCanvasToSource(canvas, source, maxDimension = DISPLAY_MAX_DIMENSION) {
  const sourceWidth = source?.videoWidth || source?.width || 0;
  const sourceHeight = source?.videoHeight || source?.height || 0;
  if (!(sourceWidth > 0 && sourceHeight > 0)) return false;

  const ratio = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * ratio));
  const height = Math.max(1, Math.round(sourceHeight * ratio));
  if (canvas.width === width && canvas.height === height) return false;

  // Assigning width/height also resets the 2D context state, which is fine here because every
  // draw re-establishes transform, composite mode and filter.
  canvas.width = width;
  canvas.height = height;
  return true;
}

// Draws the whole source frame, background included. Used when background removal is off and
// segmentation only serves to measure the body outline.
export function renderPlainFrame(outputContext, results, options = {}) {
  const { canvas } = outputContext;
  if (results?.image) {
    matchCanvasToSource(canvas, results.image, options.maxResolution);
  }
  outputContext.save();
  outputContext.setTransform(1, 0, 0, 1, 0, 0);
  outputContext.globalCompositeOperation = "source-over";
  outputContext.filter = "none";
  outputContext.clearRect(0, 0, canvas.width, canvas.height);

  if (!results?.image) {
    outputContext.restore();
    return false;
  }

  if (options.mirror) {
    outputContext.translate(canvas.width, 0);
    outputContext.scale(-1, 1);
  }
  const rect = getContainRect(results.image, canvas.width, canvas.height);
  outputContext.imageSmoothingEnabled = true;
  outputContext.drawImage(results.image, rect.x, rect.y, rect.width, rect.height);
  outputContext.restore();
  return true;
}

// The body outline itself: the bounding box of the segmented silhouette, in normalized source
// coordinates (0-1) so callers can map it into any viewport. Never mirrored here — the caller
// applies mirroring together with the landmarks.
export function measureSilhouette(results, processor, options = {}) {
  const settings = { ...DEFAULT_MASK_OPTIONS, ...options };
  const mask = buildCleanMask(results, processor, settings);
  if (!mask) return null;

  const { rect, width, height } = mask;
  if (!(rect.width > 0 && rect.height > 0)) return null;

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let covered = 0;
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (!processor.cleaned[row + x]) continue;
      covered += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // Reject speckle: a person standing in front of the camera covers a real share of the frame.
  if (maxX < minX || maxY < minY || covered < width * height * 0.002) return null;

  const normalize = (value, origin, size) => Math.min(1, Math.max(0, (value - origin) / size));
  const box = {
    minX: normalize(minX, rect.x, rect.width),
    maxX: normalize(maxX + 1, rect.x, rect.width),
    minY: normalize(minY, rect.y, rect.height),
    maxY: normalize(maxY + 1, rect.y, rect.height),
  };

  // A silhouette that runs into a frame edge is not the whole body, so any size measured from it
  // understates the person. The caller uses this to ask the user to step back.
  const EDGE = 0.015;
  return {
    ...box,
    coverage: covered / (width * height),
    clipped: {
      top: box.minY <= EDGE,
      bottom: box.maxY >= 1 - EDGE,
      left: box.minX <= EDGE,
      right: box.maxX >= 1 - EDGE,
    },
  };
}

// Keeps only person pixels. Retained for the background-removal rendering mode.
export function renderSegmentedFrame(outputContext, results, processor, options = {}) {
  const { canvas } = outputContext;
  outputContext.save();
  outputContext.setTransform(1, 0, 0, 1, 0, 0);
  outputContext.globalCompositeOperation = "source-over";
  outputContext.filter = "none";
  outputContext.clearRect(0, 0, canvas.width, canvas.height);

  const settings = { ...DEFAULT_MASK_OPTIONS, ...options };
  const mask = buildCleanMask(results, processor, settings);
  if (!mask) {
    outputContext.restore();
    return false;
  }

  const { rect, imageData, width, height } = mask;
  const maskContext = processor.context;
  const pixels = imageData.data;
  const cleanup = Math.min(1, Math.max(0, settings.edgeCleanup));
  const feather = Math.min(2, Math.max(0, settings.feather));
  for (let index = 0; index < processor.binary.length; index += 1) {
    const pixelIndex = index * 4;
    let alpha = Math.round(
      (processor.binary[index] * (1 - cleanup) + processor.cleaned[index] * cleanup) * 255,
    );
    // Feather only foreground boundary pixels. Canvas blur expands alpha outside
    // the mask and reintroduces the translucent background halo we are removing.
    if (alpha > 0 && feather > 0) {
      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        let neighbours = 0;
        neighbours += processor.cleaned[index - width - 1];
        neighbours += processor.cleaned[index - width];
        neighbours += processor.cleaned[index - width + 1];
        neighbours += processor.cleaned[index - 1];
        neighbours += processor.cleaned[index + 1];
        neighbours += processor.cleaned[index + width - 1];
        neighbours += processor.cleaned[index + width];
        neighbours += processor.cleaned[index + width + 1];
        const inwardSoftening = (1 - neighbours / 8) * Math.min(0.65, feather * 0.325);
        alpha = Math.round(alpha * (1 - inwardSoftening));
      }
    }
    pixels[pixelIndex] = 255;
    pixels[pixelIndex + 1] = 255;
    pixels[pixelIndex + 2] = 255;
    pixels[pixelIndex + 3] = alpha;
  }
  maskContext.putImageData(imageData, 0, 0);

  if (options.mirror) {
    outputContext.translate(canvas.width, 0);
    outputContext.scale(-1, 1);
  }
  outputContext.drawImage(processor.canvas, 0, 0, canvas.width, canvas.height);
  outputContext.filter = "none";
  outputContext.globalCompositeOperation = "source-in";
  outputContext.imageSmoothingEnabled = true;
  outputContext.drawImage(results.image, rect.x, rect.y, rect.width, rect.height);
  outputContext.globalCompositeOperation = "source-over";
  outputContext.restore();
  return true;
}
