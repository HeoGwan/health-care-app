export const EXERCISES = Object.freeze([
  Object.freeze({
    id: "breathing",
    title: "숨쉬기 운동",
    description: "호흡을 천천히 가다듬으며 상체의 움직임을 따라 해 보세요.",
    image: "M_Breath_front.png",
    video: "M_Breath_front.mp4",
  }),
  Object.freeze({
    id: "band-arm-stretch",
    title: "밴드 훈련",
    description: "밴드를 이용한 상체 스트레칭 동작을 정확하게 따라 해 보세요.",
    image: "M_BendArmStretch.png",
    video: "M_BendArmStretch.mp4",
  }),
  Object.freeze({
    id: "step-box",
    title: "하체 훈련",
    description: "스텝박스 동작을 따라 하며 하체의 균형과 근력을 길러 보세요.",
    image: "M_StepBox_01_Front.png",
    video: "M_StepBox_01_Front.mp4",
  }),
]);

export const DEFAULT_EXERCISE = EXERCISES[0];

export function findExercise(exerciseId) {
  return EXERCISES.find((exercise) => exercise.id === exerciseId) || DEFAULT_EXERCISE;
}
