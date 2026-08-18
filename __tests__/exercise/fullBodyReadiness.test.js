import assert from "node:assert/strict";
import {
  FULL_BODY_LOST_FRAMES,
  FULL_BODY_STABLE_FRAMES,
  INITIAL_FULL_BODY_TRACKER,
  evaluateFullBodyFrame,
  updateFullBodyTracker,
} from "../../src/exercise/utils/fullBodyReadiness.js";

function createLandmarks() {
  return Array.from({ length: 33 }, (_, index) => ({
    x: 0.3 + (index % 5) * 0.1,
    y: 0.05 + (index / 32) * 0.9,
    visibility: 0.99,
    presence: 0.99,
  }));
}

function createSilhouette(overrides = {}) {
  return {
    clipped: {
      top: false,
      bottom: false,
      left: false,
      right: false,
      ...overrides,
    },
  };
}

test("a visible head-to-toe pose with an unclipped silhouette is ready", () => {
  const result = evaluateFullBodyFrame(createLandmarks(), createSilhouette());

  assert.deepEqual(result, {
    ready: true,
    headReady: true,
    torsoReady: true,
    legsReady: true,
    feetReady: true,
    frameReady: true,
  });
});

test("the head group needs at least one visible in-frame landmark", () => {
  const landmarks = createLandmarks();
  for (let index = 0; index <= 10; index += 1) landmarks[index].visibility = 0.44;

  const result = evaluateFullBodyFrame(landmarks, createSilhouette());

  assert.equal(result.headReady, false);
  assert.equal(result.ready, false);
});

test("each foot needs an ankle, heel, or foot-index landmark", () => {
  const landmarks = createLandmarks();
  for (const index of [27, 29, 31]) landmarks[index].visibility = 0;

  const result = evaluateFullBodyFrame(landmarks, createSilhouette());

  assert.equal(result.feetReady, false);
  assert.equal(result.ready, false);
});

test("required landmarks must be inside the frame and may use presence confidence", () => {
  const outsideFrame = createLandmarks();
  for (const index of [27, 29, 31]) outsideFrame[index].x = -0.01;
  assert.equal(evaluateFullBodyFrame(outsideFrame, createSilhouette()).feetReady, false);

  const presenceOnly = createLandmarks().map(({ visibility: _visibility, ...point }) => point);
  assert.equal(evaluateFullBodyFrame(presenceOnly, createSilhouette()).ready, true);
});

test("top or bottom clipping prevents a frame from becoming ready", () => {
  const landmarks = createLandmarks();

  assert.equal(evaluateFullBodyFrame(landmarks, createSilhouette({ top: true })).frameReady, false);
  assert.equal(evaluateFullBodyFrame(landmarks, createSilhouette({ bottom: true })).frameReady, false);
  assert.equal(evaluateFullBodyFrame(landmarks, null).frameReady, false);
});

test("left and right clipping are allowed so spread arms do not block readiness", () => {
  const landmarks = createLandmarks();
  for (const index of [13, 14, 15, 16, 17, 18, 19, 20, 21, 22]) {
    landmarks[index] = { x: -1, y: -1, visibility: 0 };
  }

  const result = evaluateFullBodyFrame(
    landmarks,
    createSilhouette({ left: true, right: true }),
  );

  assert.equal(result.frameReady, true);
  assert.equal(result.ready, true);
});

test("readiness requires ten consecutive detected frames", () => {
  let tracker = { ...INITIAL_FULL_BODY_TRACKER };

  for (let frame = 1; frame < FULL_BODY_STABLE_FRAMES; frame += 1) {
    tracker = updateFullBodyTracker(tracker, true);
    assert.equal(tracker.ready, false);
    assert.equal(tracker.detectedFrames, frame);
  }

  tracker = updateFullBodyTracker(tracker, true);
  assert.equal(tracker.ready, true);
  assert.equal(tracker.detectedFrames, FULL_BODY_STABLE_FRAMES);
  assert.equal(tracker.lostFrames, 0);
});

test("a broken detection streak starts again from the first frame", () => {
  let tracker = { ...INITIAL_FULL_BODY_TRACKER };
  for (let frame = 0; frame < FULL_BODY_STABLE_FRAMES - 1; frame += 1) {
    tracker = updateFullBodyTracker(tracker, true);
  }

  tracker = updateFullBodyTracker(tracker, false);
  assert.equal(tracker.detectedFrames, 0);
  assert.equal(tracker.ready, false);

  tracker = updateFullBodyTracker(tracker, true);
  assert.equal(tracker.detectedFrames, 1);
  assert.equal(tracker.ready, false);
});

test("readiness survives two lost frames and clears on the third", () => {
  let tracker = { ...INITIAL_FULL_BODY_TRACKER };
  for (let frame = 0; frame < FULL_BODY_STABLE_FRAMES; frame += 1) {
    tracker = updateFullBodyTracker(tracker, true);
  }

  for (let loss = 1; loss < FULL_BODY_LOST_FRAMES; loss += 1) {
    tracker = updateFullBodyTracker(tracker, false);
    assert.equal(tracker.ready, true);
    assert.equal(tracker.lostFrames, loss);
  }

  tracker = updateFullBodyTracker(tracker, false);
  assert.equal(tracker.ready, false);
  assert.equal(tracker.lostFrames, FULL_BODY_LOST_FRAMES);
});
