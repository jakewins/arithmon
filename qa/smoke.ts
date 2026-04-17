import { launchGame, getState, screenshot } from "./harness";

async function main() {
  const { page, close } = await launchGame();

  console.log("Game launched and ready!");

  const state = await getState(page);
  console.log("Game state:", JSON.stringify(state, null, 2));

  const file = await screenshot(page, "smoke");
  console.log("Screenshot saved to:", file);

  await close();
  console.log("Done.");
}

main();
