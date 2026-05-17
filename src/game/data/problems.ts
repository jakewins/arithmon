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

export interface RadioChoice {
  content: string;
  correct: boolean;
}

export interface RadioWidget {
  type: "radio";
  options: {
    choices: RadioChoice[];
  };
}

export interface DualInputWidget {
  type: "dual-input";
  options: {
    labels: [string, string];
    answers: [{ value: number }, { value: number }];
  };
}

export interface ComparisonWidget {
  type: "comparison";
  options: {
    left: string;
    right: string;
    answer: ">" | "=" | "<";
  };
}

export interface NumberLineWidget {
  type: "number-line";
  options: {
    range: [number, number];
    step: number;
    labelStep: number;
    answer: number;
  };
}

export type ProblemWidget =
  | NumericInputWidget
  | RadioWidget
  | DualInputWidget
  | ComparisonWidget
  | NumberLineWidget;

export interface PerseusProblem {
  id: string;
  standard: string;
  question: {
    /** Markdown with $LaTeX$ and [[☃ widget-id]] placeholders */
    content: string;
    widgets: Record<string, ProblemWidget>;
  };
  hints: { content: string }[];
}

export interface GradeResult {
  correct: boolean;
  expected: number | string | [number, number];
}
