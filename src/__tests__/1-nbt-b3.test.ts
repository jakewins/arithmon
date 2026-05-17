import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/1-nbt-b3";

function getAnswer(problem: ReturnType<typeof generate>): string {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "comparison") return widget.options.answer;
  throw new Error(`Unexpected widget type: ${widget.type}`);
}

function getNumbers(problem: ReturnType<typeof generate>): [number, number] {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "comparison") {
    return [parseInt(widget.options.left, 10), parseInt(widget.options.right, 10)];
  }
  throw new Error(`Unexpected widget type: ${widget.type}`);
}

describe("1.NBT.B.3 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^1-nbt-b3-gen-\d+$/);
    expect(problem.standard).toBe("1.NBT.B.3");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);

    const widget = Object.values(problem.question.widgets)[0];
    expect(widget.type).toBe("comparison");
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("answer matches the actual numeric comparison", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const answer = getAnswer(problem);
      const [left, right] = getNumbers(problem);

      if (left > right) expect(answer).toBe(">");
      else if (left < right) expect(answer).toBe("<");
      else expect(answer).toBe("=");
    }
  });

  it("both numbers are two-digit (10-99)", () => {
    for (let i = 0; i < 200; i++) {
      const [left, right] = getNumbers(generate());
      expect(left).toBeGreaterThanOrEqual(10);
      expect(left).toBeLessThanOrEqual(99);
      expect(right).toBeGreaterThanOrEqual(10);
      expect(right).toBeLessThanOrEqual(99);
    }
  });

  it("produces all three variant types", () => {
    const variants = { tensDiffer: false, onesDiffer: false, equal: false };
    for (let i = 0; i < 300; i++) {
      const [left, right] = getNumbers(generate());
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

  it("answer is always one of >, =, <", () => {
    for (let i = 0; i < 100; i++) {
      const answer = getAnswer(generate());
      expect([">", "=", "<"]).toContain(answer);
    }
  });
});
