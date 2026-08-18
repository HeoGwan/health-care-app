export const FULL_BODY_STABLE_FRAMES = 10;
export const FULL_BODY_LOST_FRAMES = 3;

export const INITIAL_FULL_BODY_TRACKER = Object.freeze({
  ready: false,
  detectedFrames: 0,
  lostFrames: 0,
});

const MIN_LANDMARK_CONFIDENCE = 0.45;

const LANDMARK_GROUPS = Object.freeze({
  head: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  shoulders: Object.freeze([11, 12]),
  hips: Object.freeze([23, 24]),
  knees: Object.freeze([25, 26]),
  leftFoot: Object.freeze([27, 29, 31]),
  rightFoot: Object.freeze([28, 30, 32]),
});

function isUsableLandmark(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return false;

  const confidence = point.visibility ?? point.presence;
  return Number.isFinite(confidence) && confidence >= MIN_LANDMARK_CONFIDENCE;
}

function hasEveryLandmark(landmarks, indexes) {
  return indexes.every((index) => isUsableLandmark(landmarks[index]));
}

function hasAnyLandmark(landmarks, indexes) {
  return indexes.some((index) => isUsableLandmark(landmarks[index]));
}

export function evaluateFullBodyFrame(landmarks, silhouette) {
  const hasPose = Array.isArray(landmarks) && landmarks.length >= 33;
  const headReady = hasPose && hasAnyLandmark(landmarks, LANDMARK_GROUPS.head);
  const torsoReady =
    hasPose &&
    hasEveryLandmark(landmarks, LANDMARK_GROUPS.shoulders) &&
    hasEveryLandmark(landmarks, LANDMARK_GROUPS.hips);
  const legsReady = hasPose && hasEveryLandmark(landmarks, LANDMARK_GROUPS.knees);
  const feetReady =
    hasPose &&
    hasAnyLandmark(landmarks, LANDMARK_GROUPS.leftFoot) &&
    hasAnyLandmark(landmarks, LANDMARK_GROUPS.rightFoot);

  const frameReady = Boolean(
    silhouette?.clipped &&
      silhouette.clipped.top === false &&
      silhouette.clipped.bottom === false,
  );
  const ready = headReady && torsoReady && legsReady && feetReady && frameReady;

  return { ready, headReady, torsoReady, legsReady, feetReady, frameReady };
}

function normalizeFrameThreshold(value, fallback) {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : fallback;
}

export function updateFullBodyTracker(
  previous = INITIAL_FULL_BODY_TRACKER,
  detected,
  readyFrames = FULL_BODY_STABLE_FRAMES,
  lostFrames = FULL_BODY_LOST_FRAMES,
) {
  const stableThreshold = normalizeFrameThreshold(readyFrames, FULL_BODY_STABLE_FRAMES);
  const lostThreshold = normalizeFrameThreshold(lostFrames, FULL_BODY_LOST_FRAMES);
  const current = previous || INITIAL_FULL_BODY_TRACKER;

  if (detected) {
    const detectedFrames = Math.min(
      stableThreshold,
      Math.max(0, current.detectedFrames || 0) + 1,
    );
    return {
      ready: Boolean(current.ready) || detectedFrames >= stableThreshold,
      detectedFrames,
      lostFrames: 0,
    };
  }

  const nextLostFrames = Math.min(
    lostThreshold,
    Math.max(0, current.lostFrames || 0) + 1,
  );
  return {
    ready: Boolean(current.ready) && nextLostFrames < lostThreshold,
    detectedFrames: 0,
    lostFrames: nextLostFrames,
  };
}
