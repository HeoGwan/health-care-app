import assert from "node:assert/strict";
import {
  SESSION_PHASES,
  createSessionState,
  reduceSessionState,
} from "../../src/exercise/utils/sessionState.js";

test("a session starts in the waiting phase", () => {
  assert.deepEqual(createSessionState(), {
    phase: SESSION_PHASES.WAITING,
    countdown: 5,
    generation: 0,
  });
});

test("readiness starts a countdown that takes exactly five ticks", () => {
  let state = reduceSessionState(createSessionState(), { type: "READINESS", ready: true });
  const generation = state.generation;

  assert.deepEqual(state, {
    phase: SESSION_PHASES.COUNTDOWN,
    countdown: 5,
    generation: 1,
  });

  for (let tick = 1; tick < 5; tick += 1) {
    state = reduceSessionState(state, { type: "TICK", generation });
    assert.equal(state.phase, SESSION_PHASES.COUNTDOWN);
    assert.equal(state.countdown, 5 - tick);
    assert.equal(state.generation, generation);
  }

  state = reduceSessionState(state, { type: "TICK", generation });
  assert.deepEqual(state, {
    phase: SESSION_PHASES.PLAYING,
    countdown: 0,
    generation: generation + 1,
  });
});

test("losing readiness during countdown returns to a full countdown", () => {
  let state = reduceSessionState(createSessionState(), { type: "READINESS", ready: true });
  state = reduceSessionState(state, { type: "TICK", generation: state.generation });
  state = reduceSessionState(state, { type: "READINESS", ready: false });

  assert.deepEqual(state, {
    phase: SESSION_PHASES.WAITING,
    countdown: 5,
    generation: 2,
  });
});

test("a stale tick cannot decrement a restarted countdown after readiness loss", () => {
  let state = reduceSessionState(createSessionState(), { type: "READINESS", ready: true });
  const staleGeneration = state.generation;
  state = reduceSessionState(state, { type: "READINESS", ready: false });
  state = reduceSessionState(state, { type: "READINESS", ready: true });

  assert.equal(state.countdown, 5);
  assert.notEqual(state.generation, staleGeneration);

  const unchanged = reduceSessionState(state, { type: "TICK", generation: staleGeneration });
  assert.strictEqual(unchanged, state);
  assert.equal(unchanged.countdown, 5);
});

test("readiness changes do not alter playing, paused, or analyzing phases", () => {
  for (const phase of [
    SESSION_PHASES.PLAYING,
    SESSION_PHASES.PAUSED,
    SESSION_PHASES.ANALYZING,
  ]) {
    const state = { phase, countdown: 0, generation: 4 };
    assert.strictEqual(reduceSessionState(state, { type: "READINESS", ready: false }), state);
    assert.strictEqual(reduceSessionState(state, { type: "READINESS", ready: true }), state);
  }
});

test("pause and resume only transition their matching active phases", () => {
  const playing = { phase: SESSION_PHASES.PLAYING, countdown: 0, generation: 2 };
  const paused = reduceSessionState(playing, { type: "PAUSE" });
  assert.equal(paused.phase, SESSION_PHASES.PAUSED);

  const resumed = reduceSessionState(paused, { type: "RESUME" });
  assert.equal(resumed.phase, SESSION_PHASES.PLAYING);
  assert.strictEqual(reduceSessionState(resumed, { type: "RESUME" }), resumed);
});

test("restart returns any phase to waiting and invalidates old timers", () => {
  const state = { phase: SESSION_PHASES.PAUSED, countdown: 0, generation: 7 };

  assert.deepEqual(reduceSessionState(state, { type: "RESTART" }), {
    phase: SESSION_PHASES.WAITING,
    countdown: 5,
    generation: 8,
  });
});

test("analyze moves the session to the analyzing phase", () => {
  const state = { phase: SESSION_PHASES.PLAYING, countdown: 0, generation: 3 };
  const analyzing = reduceSessionState(state, { type: "ANALYZE" });

  assert.deepEqual(analyzing, {
    phase: SESSION_PHASES.ANALYZING,
    countdown: 0,
    generation: 3,
  });
  assert.strictEqual(reduceSessionState(analyzing, { type: "ANALYZE" }), analyzing);
});
