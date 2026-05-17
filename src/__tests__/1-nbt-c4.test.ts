import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/1-nbt-c4";

describe("1.NBT.C.4 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^1-nbt-c4-gen-\d+$/);
    expect(problem.standard).toBe("1.NBT.C.4");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("answer is always the correct sum", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      const match = content.match(/\$(\d+) \+ (\d+)\$/);
      expect(match).not.toBeNull();
      const a = parseInt(match![1], 10);
      const b = parseInt(match![2], 10);
      const expected = a + b;

      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type === "numeric-input") {
        expect(widget.options.answers[0].value).toBe(expected);
      } else if (widget.type === "radio") {
        const correct = widget.options.choices.filter((c) => c.correct);
        expect(correct.length).toBe(1);
        expect(parseInt(correct[0].content, 10)).toBe(expected);
      }
    }
  });

  it("sum is always ≤ 99 and operands are valid", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const content = problem.question.content;
      const match = content.match(/\$(\d+) \+ (\d+)\$/);
      const a = parseInt(match![1], 10);
      const b = parseInt(match![2], 10);

      expect(a).toBeGreaterThanOrEqual(10);
      expect(a).toBeLessThanOrEqual(99);
      expect(a + b).toBeLessThanOrEqual(99);
      // b is either 1-9 or a multiple of 10
      expect((b >= 1 && b <= 9) || (b >= 10 && b % 10 === 0)).toBe(true);
    }
  });

  it("produces both sub-types (ones and tens)", () => {
    const types = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const content = generate().question.content;
      const b = parseInt(content.match(/\$\d+ \+ (\d+)\$/)![1], 10);
      if (b < 10) types.add("ones");
      else types.add("tens");
    }
    expect(types.has("ones")).toBe(true);
    expect(types.has("tens")).toBe(true);
  });

  it("produces both radio and numeric-input widgets", () => {
    const types = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      types.add(widget.type);
    }
    expect(types.has("radio")).toBe(true);
    expect(types.has("numeric-input")).toBe(true);
  });
});
