/**
 * Procedural problem generator for 1.OA.A.1:
 * "Use addition and subtraction within 20 to solve word problems."
 */
import type { PerseusProblem, ProblemWidget } from "../problems";
import { makeRadioWidget } from "../radio-helpers";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const NAMES = ["Sam", "Ana", "Ben", "Mia", "Leo", "Zoe", "Max", "Ivy"];

const OBJECTS = [
  "apples",
  "balls",
  "stickers",
  "crayons",
  "marbles",
  "cookies",
  "flowers",
  "stars",
  "fish",
  "books",
];

type ProblemType = "add-to" | "take-from" | "put-together" | "compare";

interface WordProblem {
  text: string;
  answer: number;
  hint: string;
  type: ProblemType;
}

function generateAddTo(): WordProblem {
  const total = randInt(3, 20);
  const a = randInt(1, total - 1);
  const b = total - a;
  const name = pick(NAMES);
  const obj = pick(OBJECTS);
  return {
    text: `${name} has ${a} ${obj}. ${name} gets ${b} more. How many ${obj} does ${name} have now?`,
    answer: total,
    hint: `You need to add: $${a} + ${b}$.`,
    type: "add-to",
  };
}

function generateTakeFrom(): WordProblem {
  const a = randInt(3, 20);
  const b = randInt(1, a - 1);
  const answer = a - b;
  const name = pick(NAMES);
  const obj = pick(OBJECTS);
  const verb = pick(["gives away", "loses", "eats", "uses"]);
  return {
    text: `${name} has ${a} ${obj}. ${name} ${verb} ${b}. How many ${obj} are left?`,
    answer,
    hint: `You need to subtract: $${a} - ${b}$.`,
    type: "take-from",
  };
}

function generatePutTogether(): WordProblem {
  const total = randInt(2, 20);
  const a = randInt(1, total - 1);
  const b = total - a;
  const color1 = pick(["red", "blue", "green", "yellow"]);
  let color2 = pick(["red", "blue", "green", "yellow"]);
  while (color2 === color1) color2 = pick(["red", "blue", "green", "yellow"]);
  const obj = pick(OBJECTS);
  return {
    text: `There are ${a} ${color1} ${obj} and ${b} ${color2} ${obj}. How many ${obj} are there in all?`,
    answer: total,
    hint: `Put the groups together: $${a} + ${b}$.`,
    type: "put-together",
  };
}

function generateCompare(): WordProblem {
  const big = randInt(3, 20);
  const small = randInt(1, big - 1);
  const answer = big - small;
  const name1 = pick(NAMES);
  let name2 = pick(NAMES);
  while (name2 === name1) name2 = pick(NAMES);
  const obj = pick(OBJECTS);
  return {
    text: `${name1} has ${big} ${obj}. ${name2} has ${small} ${obj}. How many more does ${name1} have than ${name2}?`,
    answer,
    hint: `Find the difference: $${big} - ${small}$.`,
    type: "compare",
  };
}

const GENERATORS: (() => WordProblem)[] = [
  generateAddTo,
  generateTakeFrom,
  generatePutTogether,
  generateCompare,
];

let counter = 0;

export function generate(): PerseusProblem {
  const wp = pick(GENERATORS)();
  const id = `1-oa-a1-gen-${++counter}`;

  const useRadio = Math.random() < 0.3;
  let widget: ProblemWidget;
  let widgetKey: string;

  if (useRadio) {
    widget = makeRadioWidget(wp.answer, 0, 20);
    widgetKey = "radio 1";
  } else {
    widget = {
      type: "numeric-input",
      options: { answers: [{ value: wp.answer, status: "correct" }] },
    };
    widgetKey = "numeric-input 1";
  }

  return {
    id,
    standard: "1.OA.A.1",
    question: {
      content: `${wp.text}\n\n[[☃ ${widgetKey}]]`,
      widgets: { [widgetKey]: widget },
    },
    hints: [{ content: wp.hint }, { content: `The answer is **${wp.answer}**.` }],
  };
}
