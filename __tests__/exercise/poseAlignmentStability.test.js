import assert from "node:assert/strict";
import {
  DEFAULT_ALIGNMENT,
  calculateAutoAlignment,
  calculateGuideAlignment,
} from "../../src/exercise/utils/poseAlignment.js";

// The overlay aligns once per processed frame, so one simulated frame here is 1/20 s of a real
// session at the default "balanced" profile. These tests run whole sessions rather than the
// short convergence bursts in poseAlignment.test.js.
const FRAMES_PER_SECOND = 20;
const seconds = (value) => Math.round(value * FRAMES_PER_SECOND);

// The real stage: `.video-overlay-stage` is min(1180px, 100%) at 16:9. Simulating a smaller
// viewport hides offset-budget bugs that only appear at the size users actually see.
const VIEWPORT = Object.freeze({ viewportWidth: 1180, viewportHeight: 664 });
const STAGE_CENTER = Object.freeze({
  x: VIEWPORT.viewportWidth / 2,
  y: VIEWPORT.viewportHeight / 2,
});

// Deliberately off-centre so the guide has to both move and resize.
const GUIDE = Object.freeze({
  center: { x: 430, y: 380 },
  outlineWidth: 200,
  outlineHeight: 420,
});

const GUIDE_OPTIONS = Object.freeze({
  ...VIEWPORT,
  userTransform: { scale: 1, x: 0, y: 0 },
  manualGuideScale: 1,
  autoScaleEnabled: true,
  autoPositionEnabled: true,
  smoothingFactor: 0.18, // DEFAULT_CONTROLS.alignmentSmoothing
});

let simulatedFrames = 0;

function simulateGuide(frameCount, userAt, guideAt = () => GUIDE, overrides = {}) {
  const history = [];
  let previous = { ...DEFAULT_ALIGNMENT };
  for (let frame = 0; frame < frameCount; frame += 1) {
    previous = calculateGuideAlignment({
      ...GUIDE_OPTIONS,
      ...overrides,
      user: userAt(frame),
      guide: guideAt(frame),
      previous,
    });
    history.push({ frame, ...previous });
  }
  simulatedFrames += frameCount;
  return history;
}

// Where the guide performer actually lands on the stage once the transform is applied.
function renderedGuideCenter(guide, frameState) {
  return {
    x: STAGE_CENTER.x + (guide.center.x - STAGE_CENTER.x) * frameState.finalScale + frameState.x,
    y: STAGE_CENTER.y + (guide.center.y - STAGE_CENTER.y) * frameState.finalScale + frameState.y,
  };
}

const spread = (values) => Math.max(...values) - Math.min(...values);
const report = (message) => console.log(`    ↳ ${message}`);

const STEADY_USER = Object.freeze({
  center: { x: 760, y: 300 },
  outlineWidth: 250,
  outlineHeight: 525,
});
// min(250/200, 525/420) === 1.25
const STEADY_SCALE = 1.25;

test("the guide holds its alignment through a 15 second static session", () => {
  const history = simulateGuide(seconds(15), () => STEADY_USER);
  const settled = history.at(-1);

  assert.ok(Math.abs(settled.measuredScale - STEADY_SCALE) < 0.001);
  assert.ok(Math.abs(settled.finalScale - STEADY_SCALE) < 0.001);

  // The guide performer's centre must land exactly on the user's torso centre.
  const center = renderedGuideCenter(GUIDE, settled);
  assert.ok(Math.abs(center.x - STEADY_USER.center.x) < 0.5);
  assert.ok(Math.abs(center.y - STEADY_USER.center.y) < 0.5);

  // This correction is wider than the old fixed 300px budget.
  assert.ok(Math.abs(settled.x) > 300);

  // Nothing may drift or oscillate across the last 8 seconds.
  const tail = history.slice(-seconds(8));
  assert.ok(spread(tail.map((frame) => frame.finalScale)) < 1e-6);
  assert.ok(spread(tail.map((frame) => frame.x)) < 1e-6);
  assert.ok(spread(tail.map((frame) => frame.y)) < 1e-6);
  report(
    `15초 정지 세션 · 배율 ${settled.finalScale.toFixed(3)} · X 보정 ${settled.x.toFixed(0)}px · 중심 오차 ${Math.abs(center.x - STEADY_USER.center.x).toFixed(3)}px`,
  );
});

test("the guide reaches the user within two seconds of first detection", () => {
  const history = simulateGuide(seconds(4), () => STEADY_USER);
  const convergedAt = history.findIndex((frame) => {
    const center = renderedGuideCenter(GUIDE, frame);
    return (
      Math.abs(center.x - STEADY_USER.center.x) < 1 && Math.abs(center.y - STEADY_USER.center.y) < 1
    );
  });

  assert.ok(convergedAt > 0);
  assert.ok(convergedAt <= seconds(2));
  report(`수렴까지 ${convergedAt} 프레임 (${(convergedAt / FRAMES_PER_SECOND).toFixed(2)}초)`);
});

test("the guide tracks a user walking towards the camera without a jump", () => {
  const holdFrames = seconds(2);
  const walkFrames = seconds(8);
  const userAt = (frame) => {
    const progress = Math.min(1, Math.max(0, (frame - holdFrames) / walkFrames));
    return {
      center: { x: STAGE_CENTER.x, y: STAGE_CENTER.y },
      outlineWidth: 100 + progress * 300, // 0.5× → 2× of the guide performer
      outlineHeight: 210 + progress * 630,
    };
  };
  const history = simulateGuide(holdFrames + walkFrames + seconds(2), userAt);

  assert.ok(history.every((frame) => [frame.finalScale, frame.x, frame.y].every(Number.isFinite)));
  assert.ok(history.every((frame) => frame.finalScale >= 0.2 && frame.finalScale <= 2));
  assert.ok(Math.abs(history.at(-1).finalScale - 2) < 0.01);

  const walkPhase = history.slice(holdFrames, holdFrames + walkFrames);
  const biggestStep = Math.max(
    ...walkPhase
      .slice(1)
      .map((frame, index) => Math.abs(frame.finalScale - walkPhase[index].finalScale)),
  );
  assert.ok(biggestStep < 0.02);
  report(`8초 접근 구간 · 배율 0.5→2.0 · 프레임당 최대 변화 ${biggestStep.toFixed(4)}`);
});

test("the guide follows a user stepping side to side for 13 seconds", () => {
  const amplitude = 220;
  const period = seconds(5);
  const userAt = (frame) => ({
    center: {
      x: STAGE_CENTER.x + amplitude * Math.sin((2 * Math.PI * frame) / period),
      y: STAGE_CENTER.y,
    },
    outlineWidth: GUIDE.outlineWidth,
    outlineHeight: GUIDE.outlineHeight,
  });
  const history = simulateGuide(seconds(13), userAt);

  assert.ok(
    history.every(
      (frame) => Number.isFinite(frame.x) && Math.abs(frame.x) <= VIEWPORT.viewportWidth,
    ),
  );

  // Skip the initial approach, then measure two full cycles of tracking lag.
  const tracked = history.slice(seconds(3));
  const worstLag = Math.max(
    ...tracked.map((frame) =>
      Math.abs(renderedGuideCenter(GUIDE, frame).x - userAt(frame.frame).center.x),
    ),
  );

  // Without tracking the error would reach the full amplitude.
  assert.ok(worstLag < amplitude * 0.5);
  report(`좌우 이동 ±${amplitude}px · 최대 추종 지연 ${worstLag.toFixed(1)}px`);
});

test("a mid-session detection dropout freezes the guide and then recovers", () => {
  const dropoutStart = seconds(3);
  const dropoutEnd = seconds(5);
  const history = simulateGuide(seconds(10), (frame) =>
    frame >= dropoutStart && frame < dropoutEnd ? null : STEADY_USER,
  );

  const beforeDropout = history[dropoutStart - 1];
  const duringDropout = history.slice(dropoutStart, dropoutEnd);

  assert.ok(duringDropout.every((frame) => frame.valid === false));
  assert.ok(
    duringDropout.every(
      (frame) =>
        frame.x === beforeDropout.x &&
        frame.y === beforeDropout.y &&
        frame.finalScale === beforeDropout.finalScale,
    ),
  );

  const recovered = history.at(-1);
  const center = renderedGuideCenter(GUIDE, recovered);
  assert.ok(recovered.valid);
  assert.ok(Math.abs(center.x - STEADY_USER.center.x) < 0.5);
  assert.ok(Math.abs(center.y - STEADY_USER.center.y) < 0.5);
  report(`2초 인식 끊김 동안 ${duringDropout.length} 프레임 고정 후 정상 복귀`);
});

test("a sudden change of subject is smoothed instead of snapping", () => {
  const near = { center: { x: 300, y: 220 }, outlineWidth: 330, outlineHeight: 690 };
  const far = { center: { x: 880, y: 420 }, outlineWidth: 110, outlineHeight: 240 };
  const switchAt = seconds(3);
  const history = simulateGuide(seconds(8), (frame) => (frame < switchAt ? near : far));

  const steps = history
    .slice(1)
    .map((frame, index) => Math.hypot(frame.x - history[index].x, frame.y - history[index].y));
  const biggestStep = Math.max(...steps);

  const settledBefore = history[switchAt - 1];
  const settledAfter = history.at(-1);
  const travelled = Math.hypot(
    settledAfter.x - settledBefore.x,
    settledAfter.y - settledBefore.y,
  );

  // Smoothing must spread the move over many frames rather than snapping in one.
  assert.ok(biggestStep < travelled * 0.25);

  const center = renderedGuideCenter(GUIDE, settledAfter);
  assert.ok(Math.abs(center.x - far.center.x) < 0.5);
  assert.ok(Math.abs(center.y - far.center.y) < 0.5);
  report(
    `피사체 급변 · 총 이동 ${travelled.toFixed(0)}px 중 프레임당 최대 ${biggestStep.toFixed(1)}px (${((biggestStep / travelled) * 100).toFixed(0)}%)`,
  );
});

test("the guide follows a user at the stage edge even though it clips", () => {
  const guideWithBounds = {
    ...GUIDE,
    bounds: { minX: 300, maxX: 560, minY: 150, maxY: 610 },
  };
  const edgeUser = { center: { x: 150, y: 500 }, outlineWidth: 300, outlineHeight: 630 };
  const history = simulateGuide(seconds(10), () => edgeUser, () => guideWithBounds);
  const settled = history.at(-1);

  // Scale is driven purely by the user's outline; containment no longer caps it.
  assert.ok(Math.abs(settled.measuredScale - 1.5) < 0.001);
  assert.ok(Math.abs(settled.finalScale - 1.5) < 0.001);

  const center = renderedGuideCenter(GUIDE, settled);
  assert.ok(Math.abs(center.x - edgeUser.center.x) < 0.5);
  assert.ok(Math.abs(center.y - edgeUser.center.y) < 0.5);

  // Alignment wins over containment: part of the guide is expected to sit off-stage.
  const left =
    STAGE_CENTER.x + (guideWithBounds.bounds.minX - STAGE_CENTER.x) * settled.finalScale + settled.x;
  assert.ok(left < 0);
  report(
    `화면 가장자리 사용자 추종 · 배율 ${settled.finalScale.toFixed(2)} · 시범 영상 좌측 ${Math.abs(left).toFixed(0)}px 화면 밖`,
  );
});

test("the existing user-follows-guide mode is still stable over 18 seconds", () => {
  const guide = { center: { x: STAGE_CENTER.x, y: STAGE_CENTER.y }, outlineWidth: 200, outlineHeight: 420 };
  const user = { center: { x: 480, y: 260 }, outlineWidth: 400, outlineHeight: 780 };
  const history = [];
  let previous = { ...DEFAULT_ALIGNMENT };

  for (let frame = 0; frame < seconds(18); frame += 1) {
    previous = calculateAutoAlignment({
      ...VIEWPORT,
      guide,
      user,
      previous,
      guideTransform: { scale: 1, x: 0, y: 0 },
      manualUserScale: 1,
      autoScaleEnabled: true,
      autoPositionEnabled: true,
      smoothingFactor: 0.18,
    });
    history.push(previous);
  }
  simulatedFrames += history.length;

  const tail = history.slice(-seconds(9));
  assert.ok(spread(tail.map((frame) => frame.finalScale)) < 1e-6);
  assert.ok(spread(tail.map((frame) => frame.x)) < 1e-6);
  assert.ok(spread(tail.map((frame) => frame.y)) < 1e-6);
  assert.ok(Math.abs(history.at(-1).measuredScale - 420 / 780) < 0.001);
  report(`기존 모드 회귀 없음 · 최종 배율 ${history.at(-1).finalScale.toFixed(3)}`);
});

test("a fixed guide is unchanged while the webcam follows a moving, arms-spread user", () => {
  const fixedGuide = {
    center: { x: STAGE_CENTER.x, y: STAGE_CENTER.y },
    alignmentCenter: { x: STAGE_CENTER.x, y: STAGE_CENTER.y },
    outlineWidth: 200,
    outlineHeight: 420,
    headToFootHeight: 420,
  };
  const fixedGuideTransform = Object.freeze({ scale: 1, x: 0, y: 0 });
  const history = [];
  let previous = { ...DEFAULT_ALIGNMENT };

  for (let frame = 0; frame < seconds(12); frame += 1) {
    const user = {
      center: {
        x: STAGE_CENTER.x + 240 * Math.sin((2 * Math.PI * frame) / seconds(6)),
        y: STAGE_CENTER.y,
      },
      alignmentCenter: {
        x: STAGE_CENTER.x + 240 * Math.sin((2 * Math.PI * frame) / seconds(6)),
        y: STAGE_CENTER.y,
      },
      outlineWidth: frame % 40 < 20 ? 180 : 620,
      outlineHeight: 420,
      headToFootHeight: 420,
    };
    previous = calculateAutoAlignment({
      ...VIEWPORT,
      guide: fixedGuide,
      user,
      previous,
      guideTransform: fixedGuideTransform,
      manualUserScale: 1,
      autoScaleEnabled: true,
      autoPositionEnabled: true,
      smoothingFactor: 0.18,
    });
    history.push(previous);
  }
  simulatedFrames += history.length;

  assert.deepEqual(fixedGuideTransform, { scale: 1, x: 0, y: 0 });
  assert.ok(spread(history.map((frame) => frame.x)) > 300);
  assert.ok(history.every((frame) => Math.abs(frame.measuredScale - 1) < 0.001));
  assert.ok(history.every((frame) => Math.abs(frame.finalScale - 1) < 0.001));
  report(`고정 시범 영상 · 웹캠 X 보정 범위 ${spread(history.map((frame) => frame.x)).toFixed(0)}px`);
});

test("simulated session coverage", () => {
  const totalSeconds = simulatedFrames / FRAMES_PER_SECOND;
  assert.ok(totalSeconds >= 90);
  report(
    `총 ${simulatedFrames.toLocaleString("en-US")} 프레임 = ${(totalSeconds / 60).toFixed(1)}분 분량의 세션을 ${VIEWPORT.viewportWidth}×${VIEWPORT.viewportHeight} 실제 스테이지 크기로 시뮬레이션했습니다.`,
  );
});
