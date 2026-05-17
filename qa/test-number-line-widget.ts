import { launchGame, setupGame, showProblem, screenshot, typeAnswer, submitAnswer } from "./harness";
import type { PerseusProblem } from "./harness";

const nlProblem: PerseusProblem = {
  id: "test-nl-1",
  standard: "test",
  question: {
    content: "Show **8 + 5** on the number line. [[☃ widget1]]",
    widgets: {
      widget1: {
        type: "number-line",
        options: { range: [0, 20], step: 1, labelStep: 5, answer: 13 },
      },
    },
  },
  hints: [{ content: "Start at 8 and count 5 more" }],
};

const nlProblem100: PerseusProblem = {
  id: "test-nl-2",
  standard: "test",
  question: {
    content: "Show **34 + 20** on the number line. [[☃ widget1]]",
    widgets: {
      widget1: {
        type: "number-line",
        options: { range: [0, 100], step: 10, labelStep: 10, answer: 54 },
      },
    },
  },
  hints: [{ content: "Start at 34 and add 20" }],
};

async function main() {
  const { page, close } = await launchGame();
  try {
    await setupGame(page);

    // Test 1: Number line [0,20] step 1
    await showProblem(page, nlProblem);
    await screenshot(page, "number-line-initial-0-20");

    // Move marker to correct answer and screenshot
    await typeAnswer(page, "13");
    await screenshot(page, "number-line-at-13");

    // Submit correct answer
    await submitAnswer(page);
    await new Promise((r) => setTimeout(r, 500));
    await screenshot(page, "number-line-correct");

    // Wait for scene to close
    await new Promise((r) => setTimeout(r, 2500));

    // Test 2: Number line [0,100] step 10
    await showProblem(page, nlProblem100);
    await screenshot(page, "number-line-initial-0-100");

    // Place at wrong answer
    await typeAnswer(page, "30");
    await screenshot(page, "number-line-wrong-value");

    // Submit wrong answer
    await submitAnswer(page);
    await new Promise((r) => setTimeout(r, 500));
    await screenshot(page, "number-line-incorrect");

    console.log("All number-line screenshots captured!");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
