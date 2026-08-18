export const SESSION_PHASES = Object.freeze({
  WAITING: "waiting",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  PAUSED: "paused",
  ANALYZING: "analyzing",
});

const DEFAULT_COUNTDOWN_SECONDS = 5;

function normalizeCountdownSeconds(value) {
  return Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : DEFAULT_COUNTDOWN_SECONDS;
}

export function createSessionState(countdownSeconds = DEFAULT_COUNTDOWN_SECONDS) {
  return {
    phase: SESSION_PHASES.WAITING,
    countdown: normalizeCountdownSeconds(countdownSeconds),
    generation: 0,
  };
}

export function reduceSessionState(state, action) {
  const current = state || createSessionState();

  switch (action?.type) {
    case "READINESS":
      if (current.phase === SESSION_PHASES.WAITING && action.ready === true) {
        return {
          ...current,
          phase: SESSION_PHASES.COUNTDOWN,
          generation: current.generation + 1,
        };
      }
      if (current.phase === SESSION_PHASES.COUNTDOWN && action.ready === false) {
        return {
          phase: SESSION_PHASES.WAITING,
          countdown: normalizeCountdownSeconds(action.countdownSeconds),
          generation: current.generation + 1,
        };
      }
      return current;

    case "TICK":
      if (
        current.phase !== SESSION_PHASES.COUNTDOWN ||
        action.generation !== current.generation
      ) {
        return current;
      }
      if (current.countdown <= 1) {
        return {
          phase: SESSION_PHASES.PLAYING,
          countdown: 0,
          generation: current.generation + 1,
        };
      }
      return {
        ...current,
        countdown: current.countdown - 1,
      };

    case "PAUSE":
      return current.phase === SESSION_PHASES.PLAYING
        ? { ...current, phase: SESSION_PHASES.PAUSED }
        : current;

    case "RESUME":
      return current.phase === SESSION_PHASES.PAUSED
        ? { ...current, phase: SESSION_PHASES.PLAYING }
        : current;

    case "RESTART":
      return {
        phase: SESSION_PHASES.WAITING,
        countdown: normalizeCountdownSeconds(action.countdownSeconds),
        generation: current.generation + 1,
      };

    case "ANALYZE":
      return current.phase === SESSION_PHASES.ANALYZING
        ? current
        : { ...current, phase: SESSION_PHASES.ANALYZING };

    default:
      return current;
  }
}
