/** Perseus-inspired problem format for math challenges. */

export interface ProblemAnswer {
  value: number;
  status: "correct";
}

export interface NumericInputWidget {
  type: "numeric-input";
  options: {
    answers: ProblemAnswer[];
  };
}

export interface PerseusProblem {
  id: string;
  standard: string;
  question: {
    /** Markdown with $LaTeX$ and [[☃ widget-id]] placeholders */
    content: string;
    widgets: Record<string, NumericInputWidget>;
  };
  hints: { content: string }[];
}

export interface GradeResult {
  correct: boolean;
  expected: number;
}
