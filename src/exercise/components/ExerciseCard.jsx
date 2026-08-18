import React from "react";

const ExerciseCard = ({ title, description, image, isSelected, onClick }) => {
  return (
    <button
      type="button"
      className={`exercise-card ${isSelected ? "exercise-card--selected" : ""}`}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <img
        className="exercise-card__image"
        src={`/exercise/images/${image}`}
        alt={title}
      />
      <span className="exercise-card__copy">
        <strong className="exercise-card__title">{title}</strong>
        <span className="exercise-card__description">{description}</span>
      </span>
      <span className="exercise-card__check" aria-hidden="true">✓</span>
    </button>
  );
};

export default ExerciseCard;
