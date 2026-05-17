import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/1-nbt-c5";

describe("1.NBT.C.5 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^1-nbt-c5-gen-\d+$/);
    expect(problem.standard).toBe("1.NBT.C.5");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("answer is always base ± 10", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      const baseMatch = content.match(/than \$(\d+)\$/) || content.match(/at \$(\d+)\$/);
      const base = parseInt(baseMatch![1], 10);
      const isMore = content.includes("more");
      const expected = isMore ? base + 10 : base - 10;

      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type === "numeric-input") {
        expect(widget.options.answers[0].value).toBe(expected);
      } else if (widget.type === "radio") {
        const correct = widget.options.choices.filter((c) => c.correct);
        expect(correct.length).toBe(1);
        expect(parseInt(correct[0].content, 10)).toBe(expected);
      } else if (widget.type === "number-line") {
        expect(widget.options.answer).toBe(expected);
      }
    }
  });

  it("base and answer are always in valid range", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      const baseMatch = content.match(/than \$(\d+)\$/) || content.match(/at \$(\d+)\$/);
      const base = parseInt(baseMatch![1], 10);
      const isMore = content.includes("more");
      const answer = isMore ? base + 10 : base - 10;

      if (isMore) {
        expect(base).toBeGreaterThanOrEqual(10);
        expect(base).toBeLessThanOrEqual(89);
      } else {
        expect(base).toBeGreaterThanOrEqual(20);
        expect(base).toBeLessThanOrEqual(99);
      }
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(answer).toBeLessThanOrEqual(99);
    }
  });

  it("produces both 'more' and 'less' variants", () => {
    const variants = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const content = generate().question.content;
      if (content.includes("more")) variants.add("more");
      if (content.includes("less")) variants.add("less");
    }
    expect(variants.size).toBe(2);
  });

  it("produces radio, numeric-input, and number-line widgets", () => {
    const types = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      types.add(widget.type);
    }
    expect(types.has("radio")).toBe(true);
    expect(types.has("numeric-input")).toBe(true);
    expect(types.has("number-line")).toBe(true);
  });

  it("number-line widgets have correct range and step", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type === "number-line") {
        expect(widget.options.range).toEqual([0, 100]);
        expect(widget.options.step).toBe(10);
        expect(widget.options.labelStep).toBe(10);
        expect(widget.options.answer).toBeGreaterThanOrEqual(0);
        expect(widget.options.answer).toBeLessThanOrEqual(99);
      }
    }
  });

  it("number-line problems mention number line or direction", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type === "number-line") {
        const content = problem.question.content.toLowerCase();
        expect(content.includes("number line") || content.includes("start at")).toBe(true);
      }
    }
  });
});
