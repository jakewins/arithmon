import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/k-oa-a2";

describe("K.OA.A.2 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^k-oa-a2-gen-\d+$/);
    expect(problem.standard).toBe("K.OA.A.2");
    expect(problem.question.content).toContain("[[☃ numeric-input 1]]");
    expect(problem.question.widgets["numeric-input 1"]).toBeDefined();
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("always produces operands where the answer is correct", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const widget = problem.question.widgets["numeric-input 1"];
      const answer = widget.options.answers[0].value;
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

  it("keeps addition sums within 10", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const content = problem.question.content;
      const addMatch = content.match(/\$(\d+)\s*\+\s*(\d+)/);
      if (addMatch) {
        const a = parseInt(addMatch[1]);
        const b = parseInt(addMatch[2]);
        expect(a + b).toBeLessThanOrEqual(10);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(10);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(10);
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
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(10);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(10);
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

  it("produces operands larger than 5", () => {
    let seenLargeOperand = false;
    for (let i = 0; i < 200; i++) {
      const content = generate().question.content;
      const match = content.match(/\$(\d+)\s*[+-]\s*(\d+)/);
      if (match) {
        const a = parseInt(match[1]);
        const b = parseInt(match[2]);
        if (a > 5 || b > 5) {
          seenLargeOperand = true;
          break;
        }
      }
    }
    expect(seenLargeOperand).toBe(true);
  });
});
