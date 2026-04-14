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

/**
 * Hard-coded problem bank for STORY-0005.
 * K.OA.A.5: "Fluently add within 5"
 */
export const PROBLEMS: PerseusProblem[] = [
  {
    id: "k-oa-a5-001",
    standard: "K.OA.A.5",
    question: {
      content: "**What is $2 + 3$?**\n\n[[☃ numeric-input 1]]",
      widgets: {
        "numeric-input 1": {
          type: "numeric-input",
          options: { answers: [{ value: 5, status: "correct" }] },
        },
      },
    },
    hints: [
      { content: "Count on your fingers: start at 2, then count up 3 more: 3, 4, **5**." },
      { content: "The answer is $2 + 3 = 5$." },
    ],
  },
];
