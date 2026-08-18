import React, { useCallback, useState } from "react";
import PrimaryButton from "../components/PrimaryButton";
import {
  isExerciseRecordApiConfigured,
  saveExerciseRecord,
} from "../utils/exerciseRecordStore";

export default function ResultSummary({
  metrics = { accuracy: 0, success: 0, fail: 0, repeat: 0 },
  feedback = "시범 동작의 속도에 맞춰 머리부터 발끝까지 천천히 따라 해 보세요.",
  selectedExercise,
  userId = "local_test_user",
  onSave = () => {},
  onReport,
  onBack = () => {},
}) {
  const [saveState, setSaveState] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const apiConfigured = isExerciseRecordApiConfigured();

  const handleSaveClick = useCallback(async () => {
    if (saveState === "saving" || saveState === "saved") return;
    setSaveState("saving");
    setSaveMessage("운동 기록을 저장하고 있습니다.");

    try {
      const result = await saveExerciseRecord({
        exercise_id: selectedExercise?.id || "unknown",
        exercise_title: selectedExercise?.title || "선택한 운동",
        accuracy: metrics.accuracy,
        fail: metrics.fail,
        success: metrics.success,
        repeat: metrics.repeat,
        user_id: userId,
      });
      onSave(result);
      setSaveState("saved");
      setSaveMessage(
        result.mode === "local"
          ? "이 브라우저에 저장했습니다. 운영 서버에는 전송되지 않았습니다."
          : "설정된 운동 기록 서버에 저장했습니다.",
      );
    } catch (error) {
      console.error("기록 저장 실패:", error);
      setSaveState("error");
      setSaveMessage("운동 기록을 저장하지 못했습니다. 저장 서버 설정을 확인한 뒤 다시 시도해 주세요.");
    }
  }, [metrics, onSave, saveState, selectedExercise, userId]);

  const handleReportClick = () => {
    if (onReport) {
      onReport();
      return;
    }
    window.print();
  };

  return (
    <main className="exercise-result">
      <section className="exercise-result__card" aria-labelledby="exercise-result-title">
        <p className="exercise-result__eyebrow">{selectedExercise?.title || "운동"} 완료</p>
        <h1 id="exercise-result-title" className="exercise-result__title">운동 결과 요약</h1>

        <div className="exercise-result__stats">
          <div className="exercise-result__stat">
            <span>평균 정확도</span>
            <strong>{Math.round(metrics.accuracy)}%</strong>
          </div>
          <div className="exercise-result__stat">
            <span>총 반복 횟수</span>
            <strong>{metrics.repeat}</strong>
          </div>
        </div>

        <div className="exercise-result__feedback">
          <h2>맞춤형 피드백</h2>
          <p>{feedback}</p>
        </div>

        {!apiConfigured && (
          <p className="exercise-result__storage-note">
            로컬 테스트 모드 · 기록은 현재 브라우저에만 저장됩니다.
          </p>
        )}

        <div className="exercise-result__actions">
          <PrimaryButton
            minWidth={0}
            onClick={handleSaveClick}
            disabled={saveState === "saving" || saveState === "saved"}
          >
            {saveState === "saving" ? "저장 중" : saveState === "saved" ? "저장 완료" : "기록 저장"}
          </PrimaryButton>
          <PrimaryButton minWidth={0} variant="outline" onClick={handleReportClick}>
            보고서 보기
          </PrimaryButton>
          <PrimaryButton minWidth={0} variant="outline" onClick={onBack}>
            운동 선택으로
          </PrimaryButton>
        </div>

        {saveMessage && (
          <p
            className={`exercise-result__save-message exercise-result__save-message--${saveState}`}
            role="status"
            aria-live="polite"
          >
            {saveMessage}
          </p>
        )}
      </section>
    </main>
  );
}
