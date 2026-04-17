import { type PerseusProblem, type GradeResult } from "./data/problems";
import { generate as generateKOAA5 } from "./data/skills/k-oa-a5";

/**
 * Singleton service that manages math problem selection and grading.
 * Generates problems procedurally per skill; will eventually track skill
 * progression and use spaced repetition (ts-fsrs).
 */
class SkillTree {
  private activeProblem: PerseusProblem | null = null;

  getNextProblem(): PerseusProblem {
    this.activeProblem = generateKOAA5();
    return this.activeProblem;
  }

  gradeAnswer(problemId: string, answer: number): GradeResult {
    const problem = this.activeProblem?.id === problemId ? this.activeProblem : null;
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
