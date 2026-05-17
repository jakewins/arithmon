import { describe, expect, it } from "vitest";
import { generate } from "../game/data/skills/1-oa-d8";

function getAnswer(problem: ReturnType<typeof generate>): number {
  const widget = Object.values(problem.question.widgets)[0];
  if (widget.type === "radio") {
    const correct = widget.options.choices.find((c) => c.correct);
    return parseInt(correct!.content, 10);
  }
  if (widget.type === "numeric-input") return widget.options.answers[0].value;
  throw new Error(`Unexpected widget type: ${widget.type}`);
}

describe("1.OA.D.8 problem generator", () => {
  it("returns a valid PerseusProblem structure", () => {
    const problem = generate();
    expect(problem.id).toMatch(/^1-oa-d8-gen-\d+$/);
    expect(problem.standard).toBe("1.OA.D.8");
    expect(problem.hints.length).toBeGreaterThanOrEqual(1);

    const widget = Object.values(problem.question.widgets)[0];
    expect(["numeric-input", "radio"]).toContain(widget.type);
  });

  it("produces unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generate().id));
    expect(ids.size).toBe(20);
  });

  it("answer is correct for all equation forms", () => {
    for (let i = 0; i < 500; i++) {
      const problem = generate();
      const answer = getAnswer(problem);
      const content = problem.question.content;

      // a + ? = c or a + _ = c
      const addMissSecond = content.match(/\$(\d+)\s*\+\s*[?_\\]+\s*=\s*(\d+)\$/);
      // ? + b = c or _ + b = c
      const addMissFirst = content.match(/\$[?_\\]+\s*\+\s*(\d+)\s*=\s*(\d+)\$/);
      // a - ? = c or a - _ = c
      const subMissSub = content.match(/\$(\d+)\s*-\s*[?_\\]+\s*=\s*(\d+)\$/);
      // ? - b = c or _ - b = c
      const subMissMin = content.match(/\$[?_\\]+\s*-\s*(\d+)\s*=\s*(\d+)\$/);
      // a + b = ? or a + b = _
      const addMissSum = content.match(/\$(\d+)\s*\+\s*(\d+)\s*=\s*[?_\\]+\$/);
      // a - b = ? or a - b = _
      const subMissDiff = content.match(/\$(\d+)\s*-\s*(\d+)\s*=\s*[?_\\]+\$/);

      if (addMissSecond) {
        const a = parseInt(addMissSecond[1]);
        const c = parseInt(addMissSecond[2]);
        expect(answer).toBe(c - a);
      } else if (addMissFirst) {
        const b = parseInt(addMissFirst[1]);
        const c = parseInt(addMissFirst[2]);
        expect(answer).toBe(c - b);
      } else if (subMissSub) {
        const a = parseInt(subMissSub[1]);
        const c = parseInt(subMissSub[2]);
        expect(answer).toBe(a - c);
      } else if (subMissMin) {
        const b = parseInt(subMissMin[1]);
        const c = parseInt(subMissMin[2]);
        expect(answer).toBe(b + c);
      } else if (addMissSum) {
        const a = parseInt(addMissSum[1]);
        const b = parseInt(addMissSum[2]);
        expect(answer).toBe(a + b);
      } else if (subMissDiff) {
        const a = parseInt(subMissDiff[1]);
        const b = parseInt(subMissDiff[2]);
        expect(answer).toBe(a - b);
      } else {
        throw new Error(`Could not parse equation from: ${content}`);
      }

      expect(answer).toBeGreaterThanOrEqual(0);
      expect(answer).toBeLessThanOrEqual(20);
    }
  });

  it("produces all six equation forms", () => {
    const forms = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const content = generate().question.content;
      if (content.match(/\$(\d+)\s*\+\s*[?_\\]+\s*=\s*(\d+)\$/)) forms.add("add-missing-second");
      else if (content.match(/\$[?_\\]+\s*\+\s*(\d+)\s*=\s*(\d+)\$/))
        forms.add("add-missing-first");
      else if (content.match(/\$(\d+)\s*-\s*[?_\\]+\s*=\s*(\d+)\$/)) forms.add("sub-missing-sub");
      else if (content.match(/\$[?_\\]+\s*-\s*(\d+)\s*=\s*(\d+)\$/)) forms.add("sub-missing-min");
      else if (content.match(/\$(\d+)\s*\+\s*(\d+)\s*=\s*[?_\\]+\$/)) forms.add("add-missing-sum");
      else if (content.match(/\$(\d+)\s*-\s*(\d+)\s*=\s*[?_\\]+\$/)) forms.add("sub-missing-diff");
    }
    expect(forms.size).toBe(6);
  });

  it("produces both numeric-input and radio widget types", () => {
    const types = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      types.add(widget.type);
    }
    expect(types.has("numeric-input")).toBe(true);
    expect(types.has("radio")).toBe(true);
  });

  it("radio widgets have exactly one correct choice", () => {
    for (let i = 0; i < 100; i++) {
      const widget = Object.values(generate().question.widgets)[0];
      if (widget.type === "radio") {
        const correctCount = widget.options.choices.filter((c) => c.correct).length;
        expect(correctCount).toBe(1);
      }
    }
  });
});
