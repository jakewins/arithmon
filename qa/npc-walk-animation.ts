import { launchGame, setupGame, screenshot, walkTo, getState } from "./harness";

async function main() {
  const { page, close } = await launchGame();
  // Cotton Town main path: wide-open sand/grass, no buildings on the column.
  await setupGame(page, { map: "spyder_cotton_town", tileX: 20, tileY: 23 });
  await walkTo(page, 20, 23);

  // Spawn the test NPC 5 tiles north of the player so the walk is visible.
  await page.evaluate(() =>
    window.A!.spawnNpc("qa_walker", "beachcomber", 20, 18, "down"),
  );
  await screenshot(page, "npc-walk-01-spawned");

  // Kick off the pathfind; sample every ~200ms so the user can scrub the
  // resulting screenshots to confirm the walk cycle actually animates.
  const pathfindDone = page.evaluate(() =>
    window.A!.pathfindNpcTo("qa_walker", "player"),
  );

  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 200));
    await screenshot(page, `npc-walk-frame-${i.toString().padStart(2, "0")}`);
  }

  await pathfindDone;
  await screenshot(page, "npc-walk-99-arrived");

  const state = await getState(page);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walker = (state.npcs as Array<any>)?.find((n) => n.slug === "qa_walker");
  console.log("Final qa_walker:", walker);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log("Player:", (state as any).playerTile);
  console.log(
    "Done. Scrub qa/screenshots/npc-walk-frame-*.png to see the walk cycle.",
  );

  await close();
}

main();
