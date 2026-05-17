import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/k-oa-a4";

function getAnswer(problem: ReturnType<typeof generate>): number {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "radio") {
    const correct = widget.options.choices.find((c) => c.correct);
    return parseInt(correct!.content, 10);
  }
  if (widget.type === "numeric-input") return widget.options.answers[0].value;
  throw new Error(`Unexpected widget type: ${widget.type}`);
}

describe("K.OA.A.4 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^k-oa-a4-gen-\d+$/);
    expect(problem.standard).toBe("K.OA.A.4");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);

    const widget = Object.values(problem.question.widgets)[0];
    expect(["numeric-input", "radio"]).toContain(widget.type);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("answer always sums with the known number to make 10", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const answer = getAnswer(problem);
      const content = problem.question.content;

      // Extract the known number from the content — appears as a digit in LaTeX
      // Patterns: "? + K = 10", "10 = K + ?", "K + ? = 10", "added to K makes 10"
      const match =
        content.match(/\$\?\s*\+\s*(\d+)\s*=\s*10\$/) ||
        content.match(/\$10\s*=\s*(\d+)\s*\+/) ||
        content.match(/\$(\d+)\s*\+\s*\?\s*=\s*10\$/) ||
        content.match(/added to \$(\d+)\$/);

      expect(match).not.toBeNull();
      const known = parseInt(match![1], 10);
      expect(answer + known).toBe(10);
    }
  });

  it("answer is always between 0 and 9", () => {
    for (let i = 0; i < 200; i++) {
      const answer = getAnswer(generate());
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(answer).toBeLessThanOrEqual(9);
    }
  });

  it("produces both numeric-input and radio widget types", () => {
    const types = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      types.add(widget.type);
    }
    expect(types.has("numeric-input")).toBe(true);
    expect(types.has("radio")).toBe(true);
  });

  it("radio widgets have exactly one correct choice", () => {
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      if (widget.type === "radio") {
        const correctCount = widget.options.choices.filter((c) => c.correct).length;
        expect(correctCount).toBe(1);
      }
    }
  });
});
