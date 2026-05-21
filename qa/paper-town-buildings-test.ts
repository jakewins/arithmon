/**
 * Paper Town building / route teleport smoke test (STORY-0196).
 *
 * Walks the player onto each teleport trigger and verifies the engine emits
 * a `teleport` debug event with the upstream-correct destination. Targets
 * that aren't in our MAP_REGISTRY yet (most of the buildings/routes are
 * unported) short-circuit in `transition_teleport.start()` — we still emit
 * the event for the intended destination, so this test can verify the
 * *attempted* teleport even when the receiving map doesn't exist.
 *
 * The Mart teleport is the one whose target *is* ported (spyder_paper_scoop),
 * so we verify that one swaps the player to the scoop map.
 */
import { launchGame, setupGame, walkTo, waitForIdle, getEvents } from "./harness";
import type { Page } from "@playwright/test";

interface TeleportEvent {
  type: string;
  data: { map?: string; x?: number; y?: number };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

interface ExpectedTeleport {
  /** Trigger label (event name in the YAML). */
  label: string;
  /** Tile to walk onto. */
  tileX: number;
  tileY: number;
  facing?: "up" | "down" | "left" | "right";
  /** Approach tile (a free spot adjacent to the trigger). */
  approachX?: number;
  approachY?: number;
  /** Expected teleport destination from upstream TMX. */
  destMap: string;
  destX: number;
  destY: number;
  /** Vars to seed the session with before walking on. */
  vars?: Record<string, string | null>;
}

/** Walk onto a trigger, then assert the engine emitted the right teleport. */
async function checkTeleport(page: Page, expect: ExpectedTeleport): Promise<void> {
  await page.evaluate(() => window.A!.clearEvents?.());
  if (expect.approachX !== undefined && expect.approachY !== undefined) {
    await walkTo(page, expect.approachX, expect.approachY, expect.facing);
    await waitForIdle(page);
  }
  // walkTo onto the trigger may never resolve once a successful teleport
  // restarts the scene; fire-and-forget and poll the event log instead.
  walkTo(page, expect.tileX, expect.tileY, expect.facing).catch(() => undefined);

  const deadline = Date.now() + 5000;
  let teleport: TeleportEvent | undefined;
  while (Date.now() < deadline) {
    const events = (await getEvents(page)) as TeleportEvent[];
    teleport = events.find((e) => e.type === "teleport");
    if (teleport) break;
    await page.waitForTimeout(120);
  }
  assert(
    !!teleport,
    `[${expect.label}] expected a teleport event after stepping on (${expect.tileX},${expect.tileY})`,
  );
  assert(
    teleport!.data.map === expect.destMap,
    `[${expect.label}] expected dest map ${expect.destMap}, got ${teleport!.data.map}`,
  );
  assert(
    teleport!.data.x === expect.destX && teleport!.data.y === expect.destY,
    `[${expect.label}] expected dest (${expect.destX},${expect.destY}), got (${teleport!.data.x},${teleport!.data.y})`,
  );
  console.log(`[${expect.label}] OK -> ${expect.destMap} (${expect.destX},${expect.destY})`);
}

/**
 * The mart teleport's destination is actually in our build — verify it
 * really swaps maps rather than just emitting the event.
 */
async function testMartTeleport(): Promise<void> {
  console.log("[mart] launching...");
  const { page, close } = await launchGame();
  try {
    await setupGame(page, { map: "spyder_paper_town", tileX: 19, tileY: 13 });
    await waitForIdle(page);
    await page.evaluate(() => window.A!.clearEvents?.());

    walkTo(page, 19, 12, "up").catch(() => undefined);

    // Poll for either a teleport event or a map change.
    const deadline = Date.now() + 7000;
    let landed = false;
    while (Date.now() < deadline) {
      const state = (await page.evaluate(() => window.A!.getState())) as {
        mapKey?: string;
      };
      if (state.mapKey === "spyder_paper_scoop") {
        landed = true;
        break;
      }
      await page.waitForTimeout(150);
    }
    assert(landed, "expected to land in spyder_paper_scoop after walking on Teleport to Mart");
    console.log("[mart] OK");
  } finally {
    await close();
  }
}

/**
 * Walk onto each unported building/route trigger and verify the *intended*
 * destination matches upstream. Most of these short-circuit because the
 * destination map isn't in MAP_REGISTRY yet, but the teleport event is
 * emitted first so we can still verify the wiring is right.
 */
async function testOtherTeleports(): Promise<void> {
  console.log("[others] launching...");
  const expectations: ExpectedTeleport[] = [
    {
      label: "Teleport to Protagonist House",
      tileX: 10,
      tileY: 6,
      facing: "up",
      approachX: 10,
      approachY: 7,
      destMap: "spyder_downstairs",
      destX: 4,
      destY: 6,
    },
    {
      label: "Teleport to Daycare",
      tileX: 20,
      tileY: 4,
      facing: "up",
      approachX: 20,
      approachY: 5,
      destMap: "spyder_paper_daycare",
      destX: 3,
      destY: 8,
    },
    {
      label: "Teleport to Manor",
      tileX: 10,
      tileY: 12,
      facing: "up",
      approachX: 10,
      approachY: 13,
      destMap: "spyder_paper_manor",
      destX: 6,
      destY: 7,
    },
    {
      label: "Teleport to Rival",
      tileX: 32,
      tileY: 5,
      facing: "up",
      approachX: 32,
      approachY: 6,
      destMap: "spyder_paper_rival_downstairs",
      destX: 1,
      destY: 11,
    },
  ];

  for (const expect of expectations) {
    const { page, close } = await launchGame();
    try {
      await setupGame(page, {
        map: "spyder_paper_town",
        tileX: expect.approachX ?? expect.tileX,
        tileY: (expect.approachY ?? expect.tileY) + 1,
      });
      await waitForIdle(page);
      await checkTeleport(page, expect);
    } finally {
      await close();
    }
  }
}

async function main(): Promise<void> {
  await testMartTeleport();
  await testOtherTeleports();
  console.log("paper-town-buildings-test: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
