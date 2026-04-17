import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/k-oa-a5";

function getAnswer(problem: ReturnType<typeof generate>): number {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "radio") {
    const correct = widget.options.choices.find((c) => c.correct);
    return parseInt(correct!.content, 10);
  }
  return widget.options.answers[0].value;
}

describe("K.OA.A.5 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^k-oa-a5-gen-\d+$/);
    expect(problem.standard).toBe("K.OA.A.5");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);

    const widget = Object.values(problem.question.widgets)[0];
    expect(["numeric-input", "radio"]).toContain(widget.type);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("always produces operands where the answer is correct", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const answer = getAnswer(problem);
      const content = problem.question.content;

      const addMatch = content.match(/\$(\d+)\s*\+\s*(\d+)/);
      const subMatch = content.match(/\$(\d+)\s*-\s*(\d+)/);

      if (addMatch) {
        const a = parseInt(addMatch[1]);
        const b = parseInt(addMatch[2]);
        expect(answer).toBe(a + b);
      } else if (subMatch) {
        const a = parseInt(subMatch[1]);
        const b = parseInt(subMatch[2]);
        expect(answer).toBe(a - b);
      } else {
        throw new Error(`Could not parse operation from: ${content}`);
      }
    }
  });

  it("keeps addition sums within 5", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const content = problem.question.content;
      const addMatch = content.match(/\$(\d+)\s*\+\s*(\d+)/);
      if (addMatch) {
        const a = parseInt(addMatch[1]);
        const b = parseInt(addMatch[2]);
        expect(a + b).toBeLessThanOrEqual(5);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("keeps subtraction results non-negative", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const content = problem.question.content;
      const subMatch = content.match(/\$(\d+)\s*-\s*(\d+)/);
      if (subMatch) {
        const a = parseInt(subMatch[1]);
        const b = parseInt(subMatch[2]);
        expect(a - b).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(5);
        expect(b).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("produces both addition and subtraction problems", () => {
    const ops = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const content = generate().question.content;
      if (content.includes("+")) ops.add("add");
      if (content.includes("-")) ops.add("sub");
    }
    expect(ops.has("add")).toBe(true);
    expect(ops.has("sub")).toBe(true);
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

  it("radio widgets have 2-4 choices with unique values", () => {
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      if (widget.type === "radio") {
        const choices = widget.options.choices;
        expect(choices.length).toBeGreaterThanOrEqual(2);
        expect(choices.length).toBeLessThanOrEqual(4);
        const values = new Set(choices.map((c) => c.content));
        expect(values.size).toBe(choices.length);
      }
    }
  });
});
