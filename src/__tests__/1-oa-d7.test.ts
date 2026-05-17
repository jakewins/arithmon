import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/1-oa-d7";

function evalSide(s: string): number {
  const addMatch = s.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (addMatch) return parseInt(addMatch[1]) + parseInt(addMatch[2]);
  const subMatch = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (subMatch) return parseInt(subMatch[1]) - parseInt(subMatch[2]);
  return parseInt(s);
}

function parseEquation(content: string): { left: string; right: string } {
  // Match $$left = right$$ (radio) or $left = right$ (dropdown)
  const block = content.match(/\$\$(.+?)\s*=\s*(.+?)\$\$/);
  if (block) return { left: block[1].trim(), right: block[2].trim() };
  const inline = content.match(/\$(.+?)\s*=\s*(.+?)\$/);
  if (inline) return { left: inline[1].trim(), right: inline[2].trim() };
  throw new Error(`Cannot parse equation from: ${content}`);
}

function getCorrectAnswer(problem: ReturnType<typeof generate>): string {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "radio") {
    return widget.options.choices.find((c) => c.correct)!.content;
  }
  if (widget.type === "dropdown") {
    return widget.options.choices.find((c) => c.correct)!.content;
  }
  throw new Error(`Unexpected widget type: ${widget.type}`);
}

describe("1.OA.D.7 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^1-oa-d7-gen-\d+$/);
    expect(problem.standard).toBe("1.OA.D.7");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);

    const widget = Object.values(problem.question.widgets)[0];
    expect(["radio", "dropdown"]).toContain(widget.type);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("widget has exactly 2 choices: True and False", () => {
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      if (widget.type === "radio" || widget.type === "dropdown") {
        expect(widget.options.choices.length).toBe(2);
        const contents = widget.options.choices.map((c) => c.content).sort();
        expect(contents).toEqual(["False", "True"]);
      }
    }
  });

  it("true equations actually balance", () => {
    for (let i = 0; i < 300; i++) {
      const problem = generate();
      const answer = getCorrectAnswer(problem);
      if (answer !== "True") continue;

      const { left, right } = parseEquation(problem.question.content);
      expect(evalSide(left)).toBe(evalSide(right));
    }
  });

  it("false equations do not balance", () => {
    for (let i = 0; i < 300; i++) {
      const problem = generate();
      const answer = getCorrectAnswer(problem);
      if (answer !== "False") continue;

      const { left, right } = parseEquation(problem.question.content);
      expect(evalSide(left)).not.toBe(evalSide(right));
    }
  });

  it("produces a mix of true and false equations", () => {
    let trueCount = 0;
    for (let i = 0; i < 200; i++) {
      const answer = getCorrectAnswer(generate());
      if (answer === "True") trueCount++;
    }
    // Expect roughly 50/50, allow wide margin
    expect(trueCount).toBeGreaterThan(40);
    expect(trueCount).toBeLessThan(160);
  });

  it("has exactly one correct choice per problem", () => {
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      if (widget.type === "radio" || widget.type === "dropdown") {
        const correctCount = widget.options.choices.filter((c) => c.correct).length;
        expect(correctCount).toBe(1);
      }
    }
  });

  it("produces both radio and dropdown widgets", () => {
    const types = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      types.add(widget.type);
    }
    expect(types.has("radio")).toBe(true);
    expect(types.has("dropdown")).toBe(true);
  });

  it("dropdown problems contain the equation inline", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type !== "dropdown") continue;
      expect(problem.question.content).toContain("true or false");
      // Should have inline $ math, not block $$
      expect(problem.question.content).toMatch(/\$[^$]+=[^$]+\$/);
    }
  });
});
