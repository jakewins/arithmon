import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/1-oa-a1";

function getAnswer(problem: ReturnType<typeof generate>): number {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "radio") {
    const correct = widget.options.choices.find((c) => c.correct);
    return parseInt(correct!.content, 10);
  }
  if (widget.type === "numeric-input") return widget.options.answers[0].value;
  throw new Error(`Unexpected widget type: ${widget.type}`);
}

describe("1.OA.A.1 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^1-oa-a1-gen-\d+$/);
    expect(problem.standard).toBe("1.OA.A.1");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);

    const widget = Object.values(problem.question.widgets)[0];
    expect(["numeric-input", "radio"]).toContain(widget.type);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("answer matches the word problem arithmetic", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const answer = getAnswer(problem);
      const text = problem.question.content;

      // Extract numbers from the word problem text
      const numbers = [...text.matchAll(/\b(\d+)\b/g)].map((m) => parseInt(m[1]));
      expect(numbers.length).toBeGreaterThanOrEqual(2);

      // Answer should be within [0, 20]
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(answer).toBeLessThanOrEqual(20);

      // Verify the answer is arithmetically correct based on problem type
      if (text.includes("more.") && text.includes("How many more")) {
        // compare: big - small
        expect(answer).toBe(numbers[0] - numbers[1]);
      } else if (text.includes("gets") && text.includes("more")) {
        // add-to: a + b
        expect(answer).toBe(numbers[0] + numbers[1]);
      } else if (text.includes("left")) {
        // take-from: a - b
        expect(answer).toBe(numbers[0] - numbers[1]);
      } else if (text.includes("in all")) {
        // put-together: a + b
        expect(answer).toBe(numbers[0] + numbers[1]);
      } else if (text.includes("have now")) {
        // add-to variant
        expect(answer).toBe(numbers[0] + numbers[1]);
      }
    }
  });

  it("question text includes the operand numbers", () => {
    for (let i = 0; i < 100; i++) {
      const problem = generate();
      const text = problem.question.content;
      const numbers = [...text.matchAll(/\b(\d+)\b/g)].map((m) => parseInt(m[1]));
      expect(numbers.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("produces all four problem types", () => {
    const types = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const text = generate().question.content;
      if (text.includes("How many more")) types.add("compare");
      else if (text.includes("left")) types.add("take-from");
      else if (text.includes("in all")) types.add("put-together");
      else if (text.includes("have now")) types.add("add-to");
    }
    expect(types.size).toBe(4);
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
