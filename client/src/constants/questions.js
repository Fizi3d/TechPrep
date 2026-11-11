// Display labels for the question_type and difficulty values stored in the database

export const QUESTION_TYPES = [
  { value: 'MCQ_SINGLE', label: 'Multiple choice' },
  { value: 'MCQ_MULTI', label: 'Multiple select' },
  { value: 'TRUE_FALSE', label: 'True / false' },
  { value: 'SHORT_ANSWER', label: 'Short answer' },
  { value: 'FLASHCARD', label: 'Flashcard' },
  { value: 'FIND_THE_BUG', label: 'Find the bug' },
  { value: 'CODE_OUTPUT', label: 'Code output' },
  { value: 'BEHAVIORAL', label: 'Behavioral' },
]

export const DIFFICULTIES = ['intro', 'easy', 'medium', 'hard', 'expert']

export function typeLabel(value) {
  return QUESTION_TYPES.find((type) => type.value === value)?.label || value
}
