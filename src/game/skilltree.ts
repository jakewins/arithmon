import { PROBLEMS, type PerseusProblem, type GradeResult } from "./data/problems";

/**
 * Singleton service that manages math problem selection and grading.
 * For now returns hard-coded problems; will eventually track skill
 * progression and use spaced repetition (ts-fsrs).
 */
class SkillTree {
  getNextProblem(): PerseusProblem {
    return PROBLEMS[0];
  }

  gradeAnswer(problemId: string, answer: number): GradeResult {
    const problem = PROBLEMS.find((p) => p.id === problemId);
    if (!problem) {
      return { correct: false, expected: 0 };
    }

    const widget = Object.values(problem.question.widgets)[0];
    const correctAnswer = widget.options.answers.find((a) => a.status === "correct");
    const expected = correctAnswer?.value ?? 0;

    return {
      correct: answer === expected,
      expected,
    };
  }
}

/** Module-level singleton — survives scene restarts. */
export const skillTree = new SkillTree();
