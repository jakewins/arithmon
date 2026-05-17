import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/1-oa-b4";

function getAnswer(problem: ReturnType<typeof generate>): number {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "radio") {
    const correct = widget.options.choices.find((c) => c.correct);
    return parseInt(correct!.content, 10);
  }
  if (widget.type === "numeric-input") return widget.options.answers[0].value;
  if (widget.type === "dropdown") {
    const correct = widget.options.choices.find((c) => c.correct);
    return parseInt(correct!.content, 10);
  }
  throw new Error(`Unexpected widget type: ${widget.type}`);
}

describe("1.OA.B.4 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^1-oa-b4-gen-\d+$/);
    expect(problem.standard).toBe("1.OA.B.4");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);

    const widget = Object.values(problem.question.widgets)[0];
    expect(["numeric-input", "radio", "dropdown"]).toContain(widget.type);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("answer equals minuend minus subtrahend", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const answer = getAnswer(problem);
      const content = problem.question.content;

      // Extract the two numbers from the problem content
      // Patterns: "$A - B = {?}$" or "added to $B$ makes $A$" or "$B + {?} = A$"
      // Dropdown: "$A - B$ is the same as $B$ +"
      const subMatch = content.match(/\$(\d+)\s*-\s*(\d+)/);
      const addToMatch = content.match(/added to \$(\d+)\$ makes \$(\d+)\$/);
      const plusMatch = content.match(/\$(\d+)\s*\+\s*\{\?\}\s*=\s*(\d+)\$/);

      if (subMatch) {
        const minuend = parseInt(subMatch[1]);
        const subtrahend = parseInt(subMatch[2]);
        expect(answer).toBe(minuend - subtrahend);
      } else if (addToMatch) {
        const subtrahend = parseInt(addToMatch[1]);
        const minuend = parseInt(addToMatch[2]);
        expect(answer).toBe(minuend - subtrahend);
      } else if (plusMatch) {
        const subtrahend = parseInt(plusMatch[1]);
        const minuend = parseInt(plusMatch[2]);
        expect(answer).toBe(minuend - subtrahend);
      } else {
        throw new Error(`Could not parse operation from: ${content}`);
      }
    }
  });

  it("minuend is between 5 and 20", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generate();
      const answer = getAnswer(problem);
      const content = problem.question.content;

      const subMatch = content.match(/\$(\d+)\s*-\s*(\d+)/);
      const addToMatch = content.match(/added to \$(\d+)\$ makes \$(\d+)\$/);
      const plusMatch = content.match(/\$(\d+)\s*\+\s*\{\?\}\s*=\s*(\d+)\$/);

      let minuend: number;
      if (subMatch) minuend = parseInt(subMatch[1]);
      else if (addToMatch) minuend = parseInt(addToMatch[2]);
      else if (plusMatch) minuend = parseInt(plusMatch[2]);
      else throw new Error(`Could not parse: ${content}`);

      expect(minuend).toBeGreaterThanOrEqual(5);
      expect(minuend).toBeLessThanOrEqual(20);
      expect(answer).toBeGreaterThanOrEqual(1);
    }
  });

  it("produces numeric-input, radio, and dropdown widget types", () => {
    const types = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      types.add(widget.type);
    }
    expect(types.has("numeric-input")).toBe(true);
    expect(types.has("radio")).toBe(true);
    expect(types.has("dropdown")).toBe(true);
  });

  it("radio and dropdown widgets have exactly one correct choice", () => {
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      if (widget.type === "radio" || widget.type === "dropdown") {
        const correctCount = widget.options.choices.filter((c) => c.correct).length;
        expect(correctCount).toBe(1);
      }
    }
  });

  it("frames subtraction as unknown-addend in content", () => {
    let seenAddendFraming = false;
    for (let i = 0; i < 100; i++) {
      const content = generate().question.content;
      if (
        content.includes("+ {?} =") ||
        content.includes("added to") ||
        content.includes("is the same as") ||
        content.includes("equals")
      ) {
        seenAddendFraming = true;
        break;
      }
    }
    expect(seenAddendFraming).toBe(true);
  });

  it("dropdown has 4 choices with distractors near the answer", () => {
    for (let i = 0; i < 300; i++) {
      const problem = generate();
      const widget = Object.values(problem.question.widgets)[0];
      if (widget.type !== "dropdown") continue;
      expect(widget.options.choices.length).toBe(4);
      const correct = widget.options.choices.find((c) => c.correct)!;
      const answer = parseInt(correct.content, 10);
      for (const choice of widget.options.choices) {
        const val = parseInt(choice.content, 10);
        expect(Math.abs(val - answer)).toBeLessThanOrEqual(2);
      }
    }
  });
});
