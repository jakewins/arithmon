import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/k-nbt-a1";

describe("K.NBT.A.1 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^k-nbt-a1-gen-\d+$/);
    expect(problem.standard).toBe("K.NBT.A.1");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("target is always between 11 and 19", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      // Extract target from various formats
      const match =
        content.match(/\$(\d+)\s*=\s*10/) ||
        content.match(/10\s*\+\s*\d+\s*=\s*\\?\s*\?\$/) ||
        content.match(/in \$(\d+)\$/) ||
        content.match(/shows \$(\d+)\$/);
      expect(match).not.toBeNull();

      let target: number;
      if (content.includes("= 10 +")) {
        target = parseInt(content.match(/\$(\d+)\s*=\s*10/)![1], 10);
      } else if (content.includes("10 +") && content.includes("= \\")) {
        const ones = parseInt(content.match(/10\s*\+\s*(\d+)/)![1], 10);
        target = 10 + ones;
      } else if (content.includes("in $")) {
        target = parseInt(content.match(/in \$(\d+)\$/)![1], 10);
      } else {
        target = parseInt(content.match(/shows \$(\d+)\$/)![1], 10);
      }

      expect(target).toBeGreaterThanOrEqual(11);
      expect(target).toBeLessThanOrEqual(19);
    }
  });

  it("decompose variant has correct answer", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      if (!content.includes("= 10 +")) continue;

      const target = parseInt(content.match(/\$(\d+)\s*=\s*10/)![1], 10);
      const widget = Object.values(problem.question.widgets)[0];
      expect(widget.type).toBe("numeric-input");
      if (widget.type !== "numeric-input") continue;
      expect(widget.options.answers[0].value).toBe(target - 10);
    }
  });

  it("compose variant has correct answer", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      if (!content.includes("10 +") || !content.includes("= \\")) continue;

      const ones = parseInt(content.match(/10\s*\+\s*(\d+)/)![1], 10);
      const widget = Object.values(problem.question.widgets)[0];
      expect(widget.type).toBe("numeric-input");
      if (widget.type !== "numeric-input") continue;
      expect(widget.options.answers[0].value).toBe(10 + ones);
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
      expect(widget.options.answers[0].value).toBe(1);
      expect(widget.options.answers[1].value).toBe(target - 10);
    }
  });

  it("radio variant has exactly one correct choice", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      if (!content.includes("Which shows")) continue;

      const target = parseInt(content.match(/shows \$(\d+)\$/)![1], 10);
      const widget = Object.values(problem.question.widgets)[0];
      expect(widget.type).toBe("radio");
      if (widget.type !== "radio") continue;

      const correct = widget.options.choices.filter((c) => c.correct);
      expect(correct.length).toBe(1);
      // Correct choice should be "10 + (target-10)"
      expect(correct[0].content).toBe(`$10 + ${target - 10}$`);

      // Wrong choices should not equal target
      const wrong = widget.options.choices.filter((c) => !c.correct);
      for (const choice of wrong) {
        const d = parseInt(choice.content.match(/10\s*\+\s*(\d+)/)![1], 10);
        expect(10 + d).not.toBe(target);
      }
    }
  });

  it("generates all four variants", () => {
    const variants = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const content = problem.question.content;
      if (content.includes("= 10 +")) variants.add("decompose");
      else if (content.includes("10 +") && content.includes("= \\")) variants.add("compose");
      else if (content.includes("How many tens")) variants.add("tens-ones");
      else if (content.includes("Which shows")) variants.add("radio");
    }
    expect(variants.size).toBe(4);
  });
});
