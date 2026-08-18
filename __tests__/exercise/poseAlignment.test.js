import assert from "node:assert/strict";
import {
  DEFAULT_ALIGNMENT,
  calculateAutoAlignment,
  calculateGuideAlignment,
  measurePose,
} from "../../src/exercise/utils/poseAlignment.js";

const guide = { center: { x: 320, y: 180 }, outlineWidth: 160, outlineHeight: 300 };
const baseOptions = {
  guide,
  guideTransform: { scale: 1, x: 0, y: 0 },
  manualUserScale: 1,
  autoScaleEnabled: true,
  autoPositionEnabled: true,
  smoothingFactor: 0.25,
  viewportWidth: 640,
  viewportHeight: 360,
};

function settle(user, frames = 30) {
  let previous = { ...DEFAULT_ALIGNMENT };
  for (let frame = 0; frame < frames; frame += 1) {
    previous = calculateAutoAlignment({ ...baseOptions, user, previous });
  }
  return previous;
}

test("webcam scale is derived from height even when its outline is wider", () => {
  const result = settle({ center: { x: 320, y: 180 }, outlineWidth: 320, outlineHeight: 350 });
  assert.ok(Math.abs(result.measuredScale - 300 / 350) < 0.001);
  assert.equal(result.scaleBasis, "height");
  assert.ok(result.finalScale > 0.85 && result.finalScale < 0.86);
});

test("a distant webcam subject is enlarged within the maximum scale", () => {
  const result = settle({ center: { x: 320, y: 180 }, outlineWidth: 80, outlineHeight: 150 });
  assert.ok(Math.abs(result.measuredScale - 2) < 0.001);
  assert.ok(result.finalScale > 1.99 && result.finalScale <= 2);
});

test("an off-centre webcam subject receives a bounded correction", () => {
  const result = settle({ center: { x: 100, y: 100 }, outlineWidth: 160, outlineHeight: 300 });
  assert.ok(result.x > 200 && result.x <= 300);
  assert.ok(result.y > 70 && result.y <= 300);
});

test("manual scale remains a fine adjustment on top of automatic scale", () => {
  const result = calculateAutoAlignment({
    ...baseOptions,
    user: { center: { x: 320, y: 180 }, outlineWidth: 160, outlineHeight: 300 },
    previous: { ...DEFAULT_ALIGNMENT },
    manualUserScale: 1.2,
  });
  assert.equal(result.finalScale, 1.2);
});

test("detection loss retains the last finite transform", () => {
  const previous = { scale: 0.82, x: 42, y: -18, measuredScale: 0.8, finalScale: 0.82 };
  const result = calculateAutoAlignment({ ...baseOptions, user: null, previous });
  assert.deepEqual(result, { ...previous, valid: false });
  assert.ok([result.scale, result.x, result.y].every(Number.isFinite));
});

test("exact height matching is not reduced by wide or overflowing extremities", () => {
  const fullFrameUser = {
    center: { x: 320, y: 180 },
    outlineWidth: 80,
    outlineHeight: 100,
    bounds: { minX: 80, maxX: 560, minY: 5, maxY: 355 },
  };
  const result = settle(fullFrameUser);

  assert.equal(result.measuredScale, 3);
  assert.equal(result.containmentScale, 3.5);
  assert.ok(Math.abs(result.finalScale - 3) < 0.001);
  assert.ok(Number.isFinite(result.x) && Number.isFinite(result.y));
});

test("very close subjects may shrink below the old 0.5 floor", () => {
  const closeUser = {
    center: { x: 320, y: 180 },
    outlineWidth: 640,
    outlineHeight: 700,
    bounds: { minX: 0, maxX: 640, minY: -170, maxY: 530 },
  };
  const result = settle(closeUser);

  assert.ok(result.measuredScale < 0.5);
  assert.ok(result.finalScale >= 0.2 && result.finalScale < 0.5);
});

/* Guide-follows-user alignment: the demonstration video is the layer that moves. */

const detectedUser = { center: { x: 320, y: 180 }, outlineWidth: 160, outlineHeight: 300 };
const baseGuideOptions = {
  user: detectedUser,
  userTransform: { scale: 1, x: 0, y: 0 },
  manualGuideScale: 1,
  autoScaleEnabled: true,
  autoPositionEnabled: true,
  smoothingFactor: 0.25,
  viewportWidth: 640,
  viewportHeight: 360,
};

function settleGuide(guideMetrics, frames = 30, overrides = {}) {
  let previous = { ...DEFAULT_ALIGNMENT };
  for (let frame = 0; frame < frames; frame += 1) {
    previous = calculateGuideAlignment({
      ...baseGuideOptions,
      ...overrides,
      guide: guideMetrics,
      previous,
    });
  }
  return previous;
}

test("a guide performer larger than the user is reduced to the user's outline", () => {
  const result = settleGuide({ center: { x: 320, y: 180 }, outlineWidth: 320, outlineHeight: 600 });
  assert.ok(Math.abs(result.measuredScale - 0.5) < 0.001);
  assert.ok(result.finalScale < 0.51);
});

test("a guide performer smaller than the user is enlarged within the maximum scale", () => {
  const result = settleGuide({ center: { x: 320, y: 180 }, outlineWidth: 80, outlineHeight: 150 });
  assert.ok(Math.abs(result.measuredScale - 2) < 0.001);
  assert.ok(result.finalScale > 1.99 && result.finalScale <= 2);
});

test("an off-centre guide performer is centred on the detected user", () => {
  const result = settleGuide({ center: { x: 100, y: 100 }, outlineWidth: 160, outlineHeight: 300 });
  assert.ok(Math.abs(result.measuredScale - 1) < 0.001);
  assert.ok(Math.abs(result.x - 220) < 1);
  assert.ok(Math.abs(result.y - 80) < 1);
});

test("guide alignment keeps the manual guide scale as a fine adjustment", () => {
  const result = calculateGuideAlignment({
    ...baseGuideOptions,
    guide: { center: { x: 320, y: 180 }, outlineWidth: 160, outlineHeight: 300 },
    previous: { ...DEFAULT_ALIGNMENT },
    manualGuideScale: 1.2,
  });
  assert.equal(result.finalScale, 1.2);
});

test("the guide keeps matching the user even when that overflows the stage", () => {
  const result = settleGuide({
    center: { x: 320, y: 180 },
    outlineWidth: 80,
    outlineHeight: 100,
    bounds: { minX: 80, maxX: 560, minY: 5, maxY: 355 },
  });

  // Containment is deliberately off for the guide layer. The user is the reference, so clipping
  // the semi-transparent overlay is preferable to leaving it visibly out of alignment.
  assert.equal(result.measuredScale, 3);
  assert.ok(Math.abs(result.finalScale - 3) < 0.001);
});

test("alignment spans a full-width stage instead of stopping at a fixed pixel budget", () => {
  // The real overlay stage is min(1180px, 100%) at 16:9. A correction across it can need far
  // more than the 300px budget the first implementation allowed, which left the two people
  // permanently apart on a real screen.
  const stage = { viewportWidth: 1180, viewportHeight: 664 };
  const guide = { center: { x: 900, y: 300 }, outlineWidth: 160, outlineHeight: 300 };
  const user = { center: { x: 250, y: 480 }, outlineWidth: 160, outlineHeight: 300 };

  let previous = { ...DEFAULT_ALIGNMENT };
  for (let frame = 0; frame < 200; frame += 1) {
    previous = calculateGuideAlignment({
      ...stage,
      user,
      guide,
      previous,
      userTransform: { scale: 1, x: 0, y: 0 },
      manualGuideScale: 1,
      autoScaleEnabled: true,
      autoPositionEnabled: true,
      smoothingFactor: 0.18,
    });
  }

  const centerX = stage.viewportWidth / 2;
  const centerY = stage.viewportHeight / 2;
  const renderedX = centerX + (guide.center.x - centerX) * previous.finalScale + previous.x;
  const renderedY = centerY + (guide.center.y - centerY) * previous.finalScale + previous.y;

  assert.ok(Math.abs(previous.x) > 300);
  assert.ok(Math.abs(renderedX - user.center.x) < 0.5);
  assert.ok(Math.abs(renderedY - user.center.y) < 0.5);
});

test("a guide performer far smaller than the user is enlarged past the old 2x ceiling", () => {
  // A user standing close to the camera against a performer who fills a third of their frame
  // needs roughly 3x. The former hard-coded ceiling of 2 left the two bodies visibly different
  // sizes even though their centres matched.
  const result = settleGuide({ center: { x: 320, y: 180 }, outlineWidth: 50, outlineHeight: 100 }, 80);

  assert.ok(Math.abs(result.requestedScale - 3) < 0.001);
  assert.ok(Math.abs(result.finalScale - 3) < 0.01);
  assert.equal(result.scaleCapped, false);
});

test("the scale ceiling is reported when the outlines demand more than it allows", () => {
  const result = settleGuide(
    { center: { x: 320, y: 180 }, outlineWidth: 30, outlineHeight: 60 },
    80,
    { maxScale: 2 },
  );

  assert.ok(result.requestedScale > 2);
  assert.ok(Math.abs(result.finalScale - 2) < 0.001);
  assert.equal(result.scaleCapped, true);
});

test("a clipped head-to-foot height freezes the previous transform", () => {
  const clippedUser = {
    center: { x: 320, y: 180 },
    outlineWidth: 320,
    outlineHeight: 360, // the full frame height, not the body
    outlineHeightReliable: false,
    shoulderWidth: 200,
  };
  const guideMetrics = {
    center: { x: 320, y: 180 },
    outlineWidth: 160,
    outlineHeight: 330,
    shoulderWidth: 100,
  };
  const previous = { scale: 1.3, x: 12, y: -8, finalScale: 1.3 };
  const result = calculateGuideAlignment({
    ...baseGuideOptions,
    user: clippedUser,
    guide: guideMetrics,
    previous,
  });

  assert.deepEqual(result, { ...previous, valid: false });
});

test("shoulder and arm width never replace an unavailable body height", () => {
  const clippedUser = {
    center: { x: 320, y: 180 },
    outlineWidth: 640,
    outlineHeight: 360,
    outlineWidthReliable: false,
    outlineHeightReliable: false,
    shoulderWidth: 240,
  };
  const clippedGuide = {
    center: { x: 320, y: 180 },
    outlineWidth: 640,
    outlineHeight: 360,
    outlineWidthReliable: false,
    outlineHeightReliable: false,
    shoulderWidth: 120,
  };
  const previous = { scale: 0.9, x: -4, y: 6, finalScale: 0.9 };
  const result = calculateGuideAlignment({
    ...baseGuideOptions,
    user: clippedUser,
    guide: clippedGuide,
    previous,
  });

  assert.deepEqual(result, { ...previous, valid: false });
});

test("spreading both arms does not change webcam scale", () => {
  const normal = settle({
    center: { x: 320, y: 180 },
    outlineWidth: 160,
    outlineHeight: 300,
  });
  const armsSpread = settle({
    center: { x: 320, y: 180 },
    outlineWidth: 620,
    outlineHeight: 300,
  });

  assert.equal(normal.scaleBasis, "height");
  assert.equal(armsSpread.scaleBasis, "height");
  assert.ok(Math.abs(normal.finalScale - 1) < 0.001);
  assert.ok(Math.abs(armsSpread.finalScale - 1) < 0.001);
});

test("head-to-foot midpoints align even when torso centres differ", () => {
  const heightGuide = {
    center: { x: 320, y: 135 },
    alignmentCenter: { x: 320, y: 180 },
    outlineWidth: 160,
    outlineHeight: 300,
    headToFootHeight: 300,
    bounds: { minX: 240, maxX: 400, minY: 30, maxY: 330 },
  };
  const heightUser = {
    center: { x: 300, y: 240 },
    alignmentCenter: { x: 300, y: 200 },
    outlineWidth: 520,
    outlineHeight: 150,
    headToFootHeight: 150,
    bounds: { minX: 0, maxX: 520, minY: 125, maxY: 275 },
  };
  let previous = { ...DEFAULT_ALIGNMENT };
  for (let frame = 0; frame < 80; frame += 1) {
    previous = calculateAutoAlignment({
      ...baseOptions,
      guide: heightGuide,
      user: heightUser,
      previous,
    });
  }

  const renderY = (value) => 180 + (value - 180) * previous.finalScale + previous.y;
  assert.ok(Math.abs(previous.finalScale - 2) < 0.001);
  assert.ok(Math.abs(renderY(heightUser.bounds.minY) - heightGuide.bounds.minY) < 0.01);
  assert.ok(Math.abs(renderY(heightUser.bounds.maxY) - heightGuide.bounds.maxY) < 0.01);
});

function createMeasuredLandmarks(raisedArms = false) {
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.99,
  }));
  for (let index = 0; index <= 10; index += 1) landmarks[index].y = 0.1;
  landmarks[11] = { x: 0.42, y: 0.3, visibility: 0.99 };
  landmarks[12] = { x: 0.58, y: 0.3, visibility: 0.99 };
  landmarks[23] = { x: 0.45, y: 0.55, visibility: 0.99 };
  landmarks[24] = { x: 0.55, y: 0.55, visibility: 0.99 };
  for (const index of [27, 28, 29, 30, 31, 32]) landmarks[index].y = 0.9;
  for (const index of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22]) {
    landmarks[index].y = raisedArms ? 0.02 : 0.4;
  }
  return landmarks;
}

function measureSyntheticPose(raisedArms) {
  return measurePose(
    createMeasuredLandmarks(raisedArms),
    { width: 640, height: 360 },
    640,
    360,
    false,
    {
      minX: 0.1,
      maxX: 0.9,
      minY: raisedArms ? 0.02 : 0.08,
      maxY: 0.92,
      clipped: { top: false, bottom: false, left: false, right: false },
    },
  );
}

test("raising arms above the head does not change the measured head-to-foot height", () => {
  const armsDown = measureSyntheticPose(false);
  const armsRaised = measureSyntheticPose(true);

  assert.ok(armsRaised.outlineHeight > armsDown.outlineHeight);
  assert.equal(armsRaised.headToFootHeightReliable, true);
  assert.ok(Math.abs(armsRaised.headToFootHeight - armsDown.headToFootHeight) < 0.001);
  assert.ok(Math.abs(armsRaised.alignmentCenter.y - armsDown.alignmentCenter.y) < 0.001);

  const result = calculateAutoAlignment({
    ...baseOptions,
    guide: armsDown,
    user: armsRaised,
    previous: { ...DEFAULT_ALIGNMENT },
  });
  assert.equal(result.measuredScale, 1);
});

test("out-of-frame head landmarks invalidate height instead of extrapolating a jump", () => {
  const landmarks = createMeasuredLandmarks(false);
  for (let index = 0; index <= 10; index += 1) landmarks[index].y = -0.05;
  const metrics = measurePose(
    landmarks,
    { width: 640, height: 360 },
    640,
    360,
    false,
    {
      minX: 0.1,
      maxX: 0.9,
      minY: 0.02,
      maxY: 0.92,
      clipped: { top: false, bottom: false, left: false, right: false },
    },
  );
  const previous = { scale: 0.95, x: 12, y: -6, finalScale: 0.95 };
  const result = calculateAutoAlignment({
    ...baseOptions,
    user: metrics,
    previous,
  });

  assert.equal(metrics.headToFootHeightReliable, false);
  assert.deepEqual(result, { ...previous, valid: false });
});

test("the minimum scale limit is reported when exact height matching is impossible", () => {
  const result = settle({
    center: { x: 320, y: 180 },
    outlineWidth: 640,
    outlineHeight: 3000,
  }, 80);

  assert.equal(result.requestedScale, 0.1);
  assert.equal(result.measuredScale, 0.2);
  assert.ok(Math.abs(result.finalScale - 0.2) < 0.001);
  assert.equal(result.scaleFloored, true);
  assert.equal(result.scaleCapped, false);
});

test("alignment uses the guide transform actually rendered on screen", () => {
  const result = calculateAutoAlignment({
    ...baseOptions,
    user: { center: { x: 320, y: 180 }, outlineWidth: 160, outlineHeight: 300 },
    guideTransform: { scale: 1.5, x: 0, y: 0 },
    previous: { ...DEFAULT_ALIGNMENT },
  });

  assert.equal(result.measuredScale, 1.5);
});

test("losing the user retains the last finite guide transform", () => {
  const previous = { scale: 1.4, x: -22, y: 9, measuredScale: 1.4, finalScale: 1.4 };
  const result = calculateGuideAlignment({
    ...baseGuideOptions,
    user: null,
    guide: { center: { x: 320, y: 180 }, outlineWidth: 160, outlineHeight: 300 },
    previous,
  });

  assert.deepEqual(result, { ...previous, valid: false });
  assert.ok([result.scale, result.x, result.y].every(Number.isFinite));
});
