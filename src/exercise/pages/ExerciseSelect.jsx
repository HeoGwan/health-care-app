import React from "react";
import ExerciseCard from "../components/ExerciseCard";
import { DEFAULT_EXERCISE, EXERCISES } from "../exercises";

const ExerciseSelect = ({
  selected = DEFAULT_EXERCISE,
  onSelect,
  onStart
}) => {
  return (
    <main className="exercise-select">
      <div className="exercise-select__intro">
        <h1 className="exercise-select__title">운동 선택</h1>
        <p className="exercise-select__description">
          실시간 피드백 세션을 시작할 운동을 선택하세요.
        </p>
      </div>

      <div className="exercise-select__grid">
        {EXERCISES.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            title={exercise.title}
            description={exercise.description}
            image={exercise.image}
            isSelected={selected?.id === exercise.id}
            onClick={() => onSelect(exercise)}
          />
        ))}
      </div>

      <div className="exercise-select__action">
        <button
          type="button"
          className="exercise-select__start"
          onClick={() => onStart(selected)}
        >
          {selected.title} 시작하기
        </button>
      </div>
    </main>
  );
};

export default ExerciseSelect;
