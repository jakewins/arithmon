import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/1-nbt-b3";

function getAnswer(problem: ReturnType<typeof generate>): string {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "comparison") return widget.options.answer;
  if (widget.type === "number-line") return String(widget.options.answer);
  if (widget.type === "dropdown") {
    const correct = widget.options.choices.find((c) => c.correct);
    return correct ? correct.content : "";
  }
  throw new Error(`Unexpected widget type: ${widget.type}`);
}

function getNumbers(problem: ReturnType<typeof generate>): [number, number] | null {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "comparison") {
    return [parseInt(widget.options.left, 10), parseInt(widget.options.right, 10)];
  }
  return null; // number-line variant doesn't have two numbers to compare
}

describe("1.NBT.B.3 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^1-nbt-b3-gen-\d+$/);
    expect(problem.standard).toBe("1.NBT.B.3");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);

    const widget = Object.values(problem.question.widgets)[0];
    expect(["comparison", "number-line", "dropdown"]).toContain(widget.type);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("comparison answer matches the actual numeric comparison", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const nums = getNumbers(problem);
      if (!nums) continue; // skip number-line variants
      const answer = getAnswer(problem);
      const [left, right] = nums;

      if (left > right) expect(answer).toBe(">");
      else if (left < right) expect(answer).toBe("<");
      else expect(answer).toBe("=");
    }
  });

  it("comparison numbers are two-digit (10-99)", () => {
    for (let i = 0; i < 200; i++) {
      const nums = getNumbers(generate());
      if (!nums) continue;
      const [left, right] = nums;
      expect(left).toBeGreaterThanOrEqual(10);
      expect(left).toBeLessThanOrEqual(99);
      expect(right).toBeGreaterThanOrEqual(10);
      expect(right).toBeLessThanOrEqual(99);
    }
  });

  it("produces all three comparison variant types", () => {
    const variants = { tensDiffer: false, onesDiffer: false, equal: false };
    for (let i = 0; i < 300; i++) {
      const nums = getNumbers(generate());
      if (!nums) continue;
      const [left, right] = nums;
      const tensL = Math.floor(left / 10);
      const tensR = Math.floor(right / 10);

      if (left === right) variants.equal = true;
      else if (tensL !== tensR) variants.tensDiffer = true;
      else variants.onesDiffer = true;
    }
    expect(variants.tensDiffer).toBe(true);
    expect(variants.onesDiffer).toBe(true);
    expect(variants.equal).toBe(true);
  });

  it("comparison answer is always one of >, =, <", () => {
    for (let i = 0; i < 100; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type !== "comparison") continue;
      const answer = getAnswer(problem);
      expect([">", "=", "<"]).toContain(answer);
    }
  });

  it("produces comparison, number-line, and dropdown widgets", () => {
    const types = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      types.add(widget.type);
    }
    expect(types.has("comparison")).toBe(true);
    expect(types.has("number-line")).toBe(true);
    expect(types.has("dropdown")).toBe(true);
  });

  it("number-line widgets have correct range and step", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type === "number-line") {
        expect(widget.options.range).toEqual([0, 100]);
        expect(widget.options.step).toBe(1);
        expect(widget.options.labelStep).toBe(10);
        expect(widget.options.answer).toBeGreaterThanOrEqual(10);
        expect(widget.options.answer).toBeLessThanOrEqual(99);
      }
    }
  });

  it("number-line problems mention 'number line' in the question", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type === "number-line") {
        expect(problem.question.content.toLowerCase()).toContain("number line");
      }
    }
  });

  it("dropdown has exactly one correct choice from [greater, less, equal]", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type !== "dropdown") continue;
      const { choices } = widget.options;
      expect(choices).toHaveLength(3);
      const correctChoices = choices.filter((c) => c.correct);
      expect(correctChoices).toHaveLength(1);
      expect(["greater", "less", "equal"]).toContain(correctChoices[0].content);
    }
  });

  it("dropdown correct choice matches actual numeric comparison", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type !== "dropdown") continue;
      // Extract numbers from the question content
      const nums = problem.question.content.match(/\$(\d+)\$/g);
      if (!nums || nums.length < 2) continue;
      const left = parseInt(nums[0].replace(/\$/g, ""), 10);
      const right = parseInt(nums[1].replace(/\$/g, ""), 10);
      const correct = widget.options.choices.find((c) => c.correct)!.content;
      if (left > right) expect(correct).toBe("greater");
      else if (left < right) expect(correct).toBe("less");
      else expect(correct).toBe("equal");
    }
  });
});
