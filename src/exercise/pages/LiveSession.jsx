import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import UserPose from "../components/UserPose";
import {
  SESSION_PHASES,
  createSessionState,
  reduceSessionState,
} from "../utils/sessionState";

const COUNTDOWN_SECONDS = 5;
const INITIAL_BODY_READINESS = Object.freeze({
  ready: false,
  userReady: false,
  guideReady: false,
});

function getGuideSource(selected) {
  const video = selected?.video;
  if (!video || video === "TestExercise.mp4") return "/exercise/videos/TestExercise.mp4";
  return `/exercise/videos/reference/${video}`;
}

export default function LiveSession({ selected, onFinish = () => {} }) {
  const guideVideoRef = useRef(null);
  const [session, dispatchSession] = useReducer(
    reduceSessionState,
    COUNTDOWN_SECONDS,
    createSessionState,
  );
  const [bodyReadiness, setBodyReadiness] = useState(INITIAL_BODY_READINESS);
  const [readinessResetKey, setReadinessResetKey] = useState(0);

  useEffect(() => {
    if (session.phase !== SESSION_PHASES.COUNTDOWN) return undefined;
    const generation = session.generation;
    const timer = window.setTimeout(
      () => dispatchSession({ type: "TICK", generation }),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [session.countdown, session.generation, session.phase]);

  useEffect(() => {
    if (session.phase === SESSION_PHASES.PLAYING) {
      guideVideoRef.current?.play().catch(() => {});
    } else {
      guideVideoRef.current?.pause();
    }
  }, [session.phase]);

  const handleReadinessChange = useCallback((nextReadiness) => {
    setBodyReadiness(nextReadiness);
    dispatchSession({
      type: "READINESS",
      ready: nextReadiness.ready,
      countdownSeconds: COUNTDOWN_SECONDS,
    });
  }, []);

  const togglePlayback = () => {
    if (session.phase === SESSION_PHASES.PLAYING) dispatchSession({ type: "PAUSE" });
    if (session.phase === SESSION_PHASES.PAUSED) dispatchSession({ type: "RESUME" });
  };

  const finishSession = useCallback(async () => {
    if (session.phase === SESSION_PHASES.ANALYZING) return;
    dispatchSession({ type: "ANALYZE" });
    guideVideoRef.current?.pause();
    await onFinish();
  }, [onFinish, session.phase]);

  const restartCountdown = () => {
    guideVideoRef.current?.pause();
    if (guideVideoRef.current) guideVideoRef.current.currentTime = 0;
    dispatchSession({ type: "RESTART", countdownSeconds: COUNTDOWN_SECONDS });
    setBodyReadiness(INITIAL_BODY_READINESS);
    setReadinessResetKey((value) => value + 1);
  };

  const isPreparing =
    session.phase === SESSION_PHASES.WAITING || session.phase === SESSION_PHASES.COUNTDOWN;
  const isPaused = session.phase === SESSION_PHASES.PAUSED;
  const isAnalyzing = session.phase === SESSION_PHASES.ANALYZING;
  // Body detection and automatic alignment must continue while waiting and counting down. Only
  // playback/scoring is held back until the stable full-body gate opens.
  const isInferencePaused = isPaused || isAnalyzing;
  const isScoringEnabled = session.phase === SESSION_PHASES.PLAYING;

  return (
    <section
      className="live-session"
      aria-labelledby="live-session-title"
    >
      <div className="live-session__heading">
        <div>
          <p className="live-session__eyebrow">실시간 자세 비교</p>
          <h1 id="live-session-title">화면 속 두 사람의 자세를 맞춰 보세요</h1>
          <p>사용자 영상은 아래쪽, 시범 영상은 위쪽에 반투명하게 표시됩니다.</p>
        </div>
        <div className="live-session__actions">
          <button type="button" onClick={togglePlayback} disabled={isPreparing || isAnalyzing}>
            {isPaused ? "다시 시작" : isPreparing ? "준비 중" : "일시 정지"}
          </button>
          <button type="button" className="secondary" onClick={restartCountdown} disabled={isAnalyzing}>
            처음부터
          </button>
          <button type="button" className="secondary" onClick={finishSession} disabled={isAnalyzing}>
            결과 보기
          </button>
        </div>
      </div>

      {isPreparing && (
        <div
          className={`session-readiness session-readiness--${session.phase}`}
          role="status"
          aria-live="polite"
        >
          {session.phase === SESSION_PHASES.COUNTDOWN ? (
            <strong className="session-readiness__countdown">
              {session.countdown > 0 ? session.countdown : "시작"}
            </strong>
          ) : (
            <div className="session-readiness__spinner" aria-hidden="true" />
          )}
          <div className="session-readiness__copy">
            {session.phase === SESSION_PHASES.COUNTDOWN ? (
              <>
                <p>전신 인식이 완료되었습니다.</p>
                <span>잠시 후 운동이 시작됩니다.</span>
              </>
            ) : (
              <>
                <p>
                  {bodyReadiness.userReady
                    ? "전신 인식을 안정적으로 확인하고 있습니다."
                    : "머리부터 발끝까지 모두 보이도록 서 주세요."}
                </p>
                <span>전신이 안정적으로 인식되면 카운트다운이 시작됩니다.</span>
              </>
            )}
          </div>
        </div>
      )}

      <UserPose
        guideSrc={getGuideSource(selected)}
        guideVideoRef={guideVideoRef}
        isInferencePaused={isInferencePaused}
        isScoringEnabled={isScoringEnabled}
        readinessResetKey={readinessResetKey}
        onReadinessChange={handleReadinessChange}
        onGuideEnded={finishSession}
      />

      {isAnalyzing && (
        <div className="session-modal" role="status" aria-live="assertive">
          <div className="session-modal__card">
            <div className="session-spinner" aria-hidden="true" />
            <p>운동 결과를 분석하고 있습니다.</p>
          </div>
        </div>
      )}
    </section>
  );
}
