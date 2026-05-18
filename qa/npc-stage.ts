/**
 * NPC visual-QA stage. Boots into a neutral interior (no NPCs, no events)
 * with the player hidden, then exercises the real in-game NPC pipeline:
 *
 *   - create_npc (via spawnNpc) for each of the 4 facings -> idle screenshots
 *   - pathfind_to_char (via pathfindNpcTo) across the room -> walk-cycle frames
 *
 * Usage:  npx tsx qa/npc-stage.ts [spritesheet]
 *   spritesheet defaults to "beachcomber".
 */

import {
  launchGame,
  setupNpcStage,
  spawnNpc,
  faceNpc,
  removeNpc,
  pathfindNpcTo,
  screenshot,
  type Direction,
} from "./harness";

const SHEET = process.argv[2] ?? "beachcomber";
const SUBJECT = "qa_subject";
const DIRS: Direction[] = ["down", "left", "right", "up"];

async function main() {
  const { page, close } = await launchGame();

  // Healing center, player hidden. Camera centers on tile (6, 8).
  const stage = await setupNpcStage(page);

  // --- Idle poses: spawn fresh per facing so frame matches real create_npc ---
  for (const facing of DIRS) {
    await spawnNpc(page, SUBJECT, SHEET, stage.tileX, stage.tileY, facing);
    await screenshot(page, `npc-stage-${SHEET}-idle-${facing}`);
    await removeNpc(page, SUBJECT);
  }

  // --- Pose change on a live NPC via real char_face action ---
  await spawnNpc(page, SUBJECT, SHEET, stage.tileX, stage.tileY, "down");
  for (const facing of DIRS) {
    await faceNpc(page, SUBJECT, facing);
    await screenshot(page, `npc-stage-${SHEET}-face-${facing}`);
  }
  await removeNpc(page, SUBJECT);

  // --- Walk cycle: real pathfind_to_char toward the (invisible) player ---
  // qa_npc_stage row 5 is fully open; spawn at the left edge and pathfind right.
  const startX = 1;
  await spawnNpc(page, SUBJECT, SHEET, startX, stage.tileY, "right");
  const pathfindDone = pathfindNpcTo(page, SUBJECT, "player");

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 150));
    await screenshot(page, `npc-stage-${SHEET}-walk-${i.toString().padStart(2, "0")}`);
  }
  await pathfindDone;
  await screenshot(page, `npc-stage-${SHEET}-walk-arrived`);

  await removeNpc(page, SUBJECT);
  await close();
  console.log(
    `Done. ${4 + 4 + 11} screenshots written to qa/screenshots/ — scrub npc-stage-${SHEET}-*.png`,
  );
}

main();
