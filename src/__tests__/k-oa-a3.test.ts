import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/k-oa-a3";

describe("K.OA.A.3 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^k-oa-a3-gen-\d+$/);
    expect(problem.standard).toBe("K.OA.A.3");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);

    const widget = Object.values(problem.question.widgets)[0];
    expect(widget.type).toBe("radio");
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("always has exactly one correct choice that sums to the target", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const content = problem.question.content;

      // Extract target number from "makes $N$"
      const targetMatch = content.match(/makes \$(\d+)\$/);
      expect(targetMatch).not.toBeNull();
      const target = parseInt(targetMatch![1], 10);

      const widget = Object.values(problem.question.widgets)[0];
      expect(widget.type).toBe("radio");
      if (widget.type !== "radio") continue;

      const correctChoices = widget.options.choices.filter((c) => c.correct);
      expect(correctChoices.length).toBe(1);

      // Parse the correct pair and verify it sums to target
      const pairMatch = correctChoices[0].content.match(/(\d+)\s*\+\s*(\d+)/);
      expect(pairMatch).not.toBeNull();
      const a = parseInt(pairMatch![1], 10);
      const b = parseInt(pairMatch![2], 10);
      expect(a + b).toBe(target);
    }
  });

  it("wrong choices do not sum to the target", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const content = problem.question.content;
      const target = parseInt(content.match(/makes \$(\d+)\$/)![1], 10);

      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type !== "radio") continue;

      const wrongChoices = widget.options.choices.filter((c) => !c.correct);
      for (const choice of wrongChoices) {
        const pairMatch = choice.content.match(/(\d+)\s*\+\s*(\d+)/);
        expect(pairMatch).not.toBeNull();
        const a = parseInt(pairMatch![1], 10);
        const b = parseInt(pairMatch![2], 10);
        expect(a + b).not.toBe(target);
      }
    }
  });

  it("target is always between 2 and 10", () => {
    for (let i = 0; i < 200; i++) {
      const content = generate().question.content;
      const target = parseInt(content.match(/makes \$(\d+)\$/)![1], 10);
      expect(target).toBeGreaterThanOrEqual(2);
      expect(target).toBeLessThanOrEqual(10);
    }
  });

  it("correct pair components are both positive", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type !== "radio") continue;

      const correct = widget.options.choices.find((c) => c.correct)!;
      const pairMatch = correct.content.match(/(\d+)\s*\+\s*(\d+)/);
      const a = parseInt(pairMatch![1], 10);
      const b = parseInt(pairMatch![2], 10);
      expect(a).toBeGreaterThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(1);
    }
  });

  it("has at least 3 choices per problem", () => {
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      if (widget.type === "radio") {
        expect(widget.options.choices.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
