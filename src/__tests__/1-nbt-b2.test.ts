import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/1-nbt-b2";

describe("1.NBT.B.2 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^1-nbt-b2-gen-\d+$/);
    expect(problem.standard).toBe("1.NBT.B.2");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("target is always between 10 and 99", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      let target: number;

      if (content.includes("How many tens")) {
        target = parseInt(content.match(/in \$(\d+)\$/)![1], 10);
      } else if (content.includes("What number has")) {
        const tens = parseInt(content.match(/\$(\d+)\$ tens/)![1], 10);
        const ones = parseInt(content.match(/\$(\d+)\$ ones/)![1], 10);
        target = tens * 10 + ones;
      } else {
        target = parseInt(content.match(/shows \$(\d+)\$/)![1], 10);
      }

      expect(target).toBeGreaterThanOrEqual(10);
      expect(target).toBeLessThanOrEqual(99);
    }
  });

  it("tens-ones variant has correct dual-input answer", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      if (!content.includes("How many tens")) continue;

      const target = parseInt(content.match(/in \$(\d+)\$/)![1], 10);
      const widget = Object.values(problem.question.widgets)[0];
      expect(widget.type).toBe("dual-input");
      if (widget.type !== "dual-input") continue;
      expect(widget.options.answers[0].value).toBe(Math.floor(target / 10));
      expect(widget.options.answers[1].value).toBe(target % 10);
    }
  });

  it("compose variant has correct numeric-input answer", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      if (!content.includes("What number has")) continue;

      const tens = parseInt(content.match(/\$(\d+)\$ tens/)![1], 10);
      const ones = parseInt(content.match(/\$(\d+)\$ ones/)![1], 10);
      const widget = Object.values(problem.question.widgets)[0];
      expect(widget.type).toBe("numeric-input");
      if (widget.type !== "numeric-input") continue;
      expect(widget.options.answers[0].value).toBe(tens * 10 + ones);
    }
  });

  it("radio variant has exactly one correct choice", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      if (!content.includes("Which shows")) continue;

      const target = parseInt(content.match(/shows \$(\d+)\$/)![1], 10);
      const tens = Math.floor(target / 10);
      const ones = target % 10;
      const widget = Object.values(problem.question.widgets)[0];
      expect(widget.type).toBe("radio");
      if (widget.type !== "radio") continue;

      const correct = widget.options.choices.filter((c) => c.correct);
      expect(correct.length).toBe(1);
      expect(correct[0].content).toBe(`$${tens}$ tens $${ones}$ ones`);

      // Wrong choices should not equal target
      const wrong = widget.options.choices.filter((c) => !c.correct);
      for (const choice of wrong) {
        const t = parseInt(choice.content.match(/\$(\d+)\$ tens/)![1], 10);
        const o = parseInt(choice.content.match(/\$(\d+)\$ ones/)![1], 10);
        expect(t * 10 + o).not.toBe(target);
      }
    }
  });

  it("generates all three variants", () => {
    const variants = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const content = problem.question.content;
      if (content.includes("How many tens")) variants.add("tens-ones");
      else if (content.includes("What number has")) variants.add("compose");
      else if (content.includes("Which shows")) variants.add("radio");
    }
    expect(variants.size).toBe(3);
  });
});
