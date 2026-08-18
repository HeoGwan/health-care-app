import { getContainRect } from "./segmentationRenderer.js";

const LANDMARK_INDEXES = Object.freeze({
  head: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftFoot: Object.freeze([27, 29, 31]),
  rightFoot: Object.freeze([28, 30, 32]),
});

const MIN_VISIBILITY = 0.35;

// How far a layer may be resized to match the other. The upper bound used to be 2, which silently
// capped the guide whenever the user stood close to the camera; it is now a tunable ceiling.
export const MIN_AUTO_SCALE = 0.2;
export const MAX_AUTO_SCALE = 3.5;

export const DEFAULT_ALIGNMENT = Object.freeze({ scale: 1, x: 0, y: 0 });

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isVisible(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) && (point.visibility ?? 1) >= MIN_VISIBILITY;
}

function isVisibleInFrame(point) {
  return isVisible(point) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

function mapPoint(point, rect, mirror) {
  const normalizedX = mirror ? 1 - point.x : point.x;
  return {
    x: rect.x + normalizedX * rect.width,
    y: rect.y + point.y * rect.height,
  };
}

// Maps a normalized silhouette box (0-1 in source space) into viewport pixels, mirroring it the
// same way the landmarks are mirrored so both describe the same on-screen body.
function mapSilhouette(silhouette, rect, mirror) {
  if (!silhouette) return null;
  const left = mirror ? 1 - silhouette.maxX : silhouette.minX;
  const right = mirror ? 1 - silhouette.minX : silhouette.maxX;
  return {
    minX: rect.x + left * rect.width,
    maxX: rect.x + right * rect.width,
    minY: rect.y + silhouette.minY * rect.height,
    maxY: rect.y + silhouette.maxY * rect.height,
  };
}

export function measurePose(landmarks, source, targetWidth, targetHeight, mirror = false, silhouette = null) {
  if (!Array.isArray(landmarks) || landmarks.length < 33) return null;

  const leftShoulder = landmarks[LANDMARK_INDEXES.leftShoulder];
  const rightShoulder = landmarks[LANDMARK_INDEXES.rightShoulder];
  const leftHip = landmarks[LANDMARK_INDEXES.leftHip];
  const rightHip = landmarks[LANDMARK_INDEXES.rightHip];
  if (![leftShoulder, rightShoulder, leftHip, rightHip].every(isVisible)) return null;

  const rect = getContainRect(source, targetWidth, targetHeight);
  const mapped = [leftShoulder, rightShoulder, leftHip, rightHip].map((point) => mapPoint(point, rect, mirror));
  const shoulderWidth = Math.hypot(mapped[0].x - mapped[1].x, mapped[0].y - mapped[1].y);
  const center = mapped.reduce(
    (sum, point) => ({ x: sum.x + point.x / mapped.length, y: sum.y + point.y / mapped.length }),
    { x: 0, y: 0 },
  );

  const visiblePoints = landmarks.filter(isVisible).map((point) => mapPoint(point, rect, mirror));
  const xs = visiblePoints.map((point) => point.x);
  const ys = visiblePoints.map((point) => point.y);
  const landmarkBounds = xs.length
    ? {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      }
    : null;
  const personHeight = landmarkBounds ? landmarkBounds.maxY - landmarkBounds.minY : 0;
  const personWidth = landmarkBounds ? landmarkBounds.maxX - landmarkBounds.minX : 0;
  if (!Number.isFinite(shoulderWidth) || shoulderWidth <= 1 || !Number.isFinite(personHeight)) return null;

  // The body outline drives sizing. The segmented silhouette is the real outline; the landmark
  // box is the fallback when no mask is available for this frame.
  const outlineBounds = mapSilhouette(silhouette, rect, mirror) || landmarkBounds;
  const outlineWidth = outlineBounds ? outlineBounds.maxX - outlineBounds.minX : 0;
  const outlineHeight = outlineBounds ? outlineBounds.maxY - outlineBounds.minY : 0;
  if (!(outlineWidth > 1) || !(outlineHeight > 1)) return null;

  // An axis that runs off the frame measures the frame, not the body: it saturates at the source
  // size and drags any ratio built from it towards 1. Landmarks are extrapolated beyond the frame
  // by the model, so the fallback box is never clipped this way.
  const clipped = silhouette?.clipped;
  const outlineWidthReliable = !clipped || !(clipped.left || clipped.right);
  const outlineHeightReliable = !clipped || !(clipped.top || clipped.bottom);
  const mapVisibleGroup = (indexes) =>
    indexes
      .filter((index) => isVisibleInFrame(landmarks[index]))
      .map((index) => mapPoint(landmarks[index], rect, mirror));
  const headPoints = mapVisibleGroup(LANDMARK_INDEXES.head);
  const leftFootPoints = mapVisibleGroup(LANDMARK_INDEXES.leftFoot);
  const rightFootPoints = mapVisibleGroup(LANDMARK_INDEXES.rightFoot);
  const feetPoints = [...leftFootPoints, ...rightFootPoints];
  const hasHeadAndBothFeet = headPoints.length > 0 && leftFootPoints.length > 0 && rightFootPoints.length > 0;
  const headY = hasHeadAndBothFeet ? Math.min(...headPoints.map((point) => point.y)) : 0;
  const footY = hasHeadAndBothFeet ? Math.max(...feetPoints.map((point) => point.y)) : 0;
  const headToFootHeight = footY - headY;
  const headToFootHeightReliable =
    hasHeadAndBothFeet && headToFootHeight > 1 && outlineHeightReliable;
  const alignmentCenter = {
    // Horizontal alignment stays anchored to the torso so an outstretched arm cannot pull the
    // webcam sideways. Vertically, use only head and foot landmarks so raised arms cannot pull
    // the anchor above the head.
    x: center.x,
    y: headToFootHeightReliable ? (headY + footY) / 2 : (outlineBounds.minY + outlineBounds.maxY) / 2,
  };

  return {
    center,
    alignmentCenter,
    shoulderWidth,
    personHeight,
    personWidth,
    headY,
    footY,
    headToFootHeight,
    headToFootHeightReliable,
    outlineWidth,
    outlineHeight,
    outlineWidthReliable,
    outlineHeightReliable,
    outlineSource: silhouette ? "silhouette" : "landmarks",
    bounds: outlineBounds,
    sourceWidth: source?.videoWidth || source?.width || targetWidth,
    sourceHeight: source?.videoHeight || source?.height || targetHeight,
    sourceRect: rect,
  };
}

function interpolate(previous, target, factor) {
  return previous + (target - previous) * factor;
}

// Computes the transform that moves `source` onto `target`. Both layers are measured in the
// same viewport coordinate space, so the maths is symmetric: the caller decides which layer
// moves. `calculateAutoAlignment` moves the webcam layer onto the guide;
// `calculateGuideAlignment` moves the guide layer onto the webcam subject.
function calculateAlignment({
  target,
  source,
  previous = DEFAULT_ALIGNMENT,
  targetTransform,
  manualSourceScale,
  autoScaleEnabled,
  autoPositionEnabled,
  smoothingFactor,
  viewportWidth,
  viewportHeight,
  maxScale = MAX_AUTO_SCALE,
}) {
  if (!target || !source) return { ...previous, valid: false };

  const factor = clamp(smoothingFactor, 0.1, 0.25);
  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;
  const targetScale = targetTransform.scale;
  const targetAlignmentCenter = target.alignmentCenter || target.center;
  const sourceAlignmentCenter = source.alignmentCenter || source.center;
  const targetCenterX = centerX + (targetAlignmentCenter.x - centerX) * targetScale + targetTransform.x;
  const targetCenterY = centerY + (targetAlignmentCenter.y - centerY) * targetScale + targetTransform.y;
  // Arms can change the silhouette width by several times without changing the person's size.
  // Scale only from the complete head-to-foot height and keep the previous transform whenever
  // either vertical outline is clipped or unavailable.
  const targetHeight = target.headToFootHeight ?? target.outlineHeight;
  const sourceHeight = source.headToFootHeight ?? source.outlineHeight;
  const hasReliableHeight =
    targetHeight > 1 &&
    sourceHeight > 1 &&
    target.headToFootHeightReliable !== false &&
    source.headToFootHeightReliable !== false &&
    target.outlineHeightReliable !== false &&
    source.outlineHeightReliable !== false;
  if (!hasReliableHeight) return { ...previous, valid: false };

  const scaleBasis = "height";
  const requestedScale = (targetHeight * targetScale) / sourceHeight;
  const measuredScale = clamp(requestedScale, MIN_AUTO_SCALE, maxScale);
  // Exact head-to-foot overlap wins over keeping every extremity inside the stage. A containment
  // cap would silently shrink the webcam again when arms extend beyond the reference frame.
  const containmentScale = maxScale;
  const safeFinalTarget = Math.min(measuredScale * manualSourceScale, maxScale);
  const targetAutoScale = autoScaleEnabled
    ? clamp(safeFinalTarget / Math.max(manualSourceScale, 0.01), MIN_AUTO_SCALE, maxScale)
    : 1;
  const autoScale = interpolate(previous.scale, targetAutoScale, factor);
  const appliedAutoScale = autoScaleEnabled ? autoScale : 1;
  const finalScale = clamp(appliedAutoScale * manualSourceScale, MIN_AUTO_SCALE, maxScale);

  const scaledSourceX = centerX + (sourceAlignmentCenter.x - centerX) * finalScale;
  const scaledSourceY = centerY + (sourceAlignmentCenter.y - centerY) * finalScale;
  // The correction has to be able to span the stage. A fixed pixel budget silently caps the
  // offset on wide stages and leaves the two people permanently apart.
  const targetX = autoPositionEnabled
    ? clamp(targetCenterX - scaledSourceX, -viewportWidth, viewportWidth)
    : 0;
  const targetY = autoPositionEnabled
    ? clamp(targetCenterY - scaledSourceY, -viewportHeight, viewportHeight)
    : 0;

  const x = interpolate(previous.x, targetX, factor);
  const y = interpolate(previous.y, targetY, factor);
  if (![autoScale, x, y, finalScale].every(Number.isFinite)) return { ...previous, valid: false };

  return {
    scale: autoScale,
    x,
    y,
    requestedScale,
    scaleBasis,
    measuredScale,
    containmentScale,
    finalScale,
    // True when the head-to-foot heights demand more enlargement than the ceiling allows.
    scaleCapped: autoScaleEnabled && requestedScale > maxScale + 0.001,
    scaleFloored: autoScaleEnabled && requestedScale < MIN_AUTO_SCALE - 0.001,
    valid: true,
  };
}

// Moves the webcam layer so the user matches the guide performer.
export function calculateAutoAlignment({ guide, user, guideTransform, manualUserScale, ...rest }) {
  return calculateAlignment({
    ...rest,
    target: guide,
    source: user,
    targetTransform: guideTransform,
    manualSourceScale: manualUserScale,
  });
}

// Moves the guide layer so the demonstration video is centred on the detected user and
// scaled so its head-to-foot height matches the user. The user is the reference here, so the
// guide follows even when part of it ends up outside the stage.
export function calculateGuideAlignment({ user, guide, userTransform, manualGuideScale, ...rest }) {
  return calculateAlignment({
    ...rest,
    target: user,
    source: guide,
    targetTransform: userTransform,
    manualSourceScale: manualGuideScale,
  });
}
