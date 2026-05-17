import { launchGame, setupGame, showProblem, screenshot, typeAnswer, submitAnswer } from "./harness";
import type { PerseusProblem } from "./harness";

const dropdownProblem: PerseusProblem = {
  id: "test-dd-1",
  standard: "test",
  question: {
    content: "12 is ___ than 8 [[☃ widget1]]",
    widgets: {
      widget1: {
        type: "dropdown",
        options: {
          placeholder: "choose",
          choices: [
            { content: "greater", correct: true },
            { content: "less", correct: false },
            { content: "equal", correct: false },
          ],
        },
      },
    },
  },
  hints: [{ content: "Which number is bigger?" }],
};

async function main() {
  const { page, close } = await launchGame();
  try {
    await setupGame(page);

    // Show dropdown problem
    await showProblem(page, dropdownProblem);
    await new Promise((r) => setTimeout(r, 500));
    await screenshot(page, "dropdown-initial");

    // Open dropdown by clicking the placeholder area on canvas (center of game = 480,
    // dropdown is ~70px from top at 3x scale = ~210)
    // The canvas renders at 3x: 320->960, 240->720
    await page.mouse.click(480, 210);
    await new Promise((r) => setTimeout(r, 300));
    await screenshot(page, "dropdown-open");

    // Select first choice via debug bridge (index 0 = "greater")
    await typeAnswer(page, "0");
    await new Promise((r) => setTimeout(r, 300));
    await screenshot(page, "dropdown-selected");

    // Submit correct answer
    await submitAnswer(page);
    await new Promise((r) => setTimeout(r, 500));
    await screenshot(page, "dropdown-correct");

    // Wait for scene to close
    await new Promise((r) => setTimeout(r, 2500));

    // Test wrong answer
    await showProblem(page, dropdownProblem);
    await new Promise((r) => setTimeout(r, 300));
    await typeAnswer(page, "1"); // select index 1 = "less"
    await submitAnswer(page);
    await new Promise((r) => setTimeout(r, 500));
    await screenshot(page, "dropdown-incorrect");

    console.log("All dropdown screenshots captured!");
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
