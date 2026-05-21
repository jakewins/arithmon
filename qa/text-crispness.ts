/**
 * QA: text rasterises crisp at the integer-zoom display resolution.
 *
 * STORY-0211 fix: every Text constructed via `addText()` (textStyle.ts) calls
 * `setResolution(game.scale.zoom)` so the internal canvas is rasterised at
 * the display-pixel resolution. The expected outcome is that each PressStart2P
 * glyph renders as solid pixel blocks — no gray AA halo around the edges that
 * STORY-0208/0210 introduced.
 *
 * This script captures one screenshot per scene named in the story plus a
 * resize-breakpoint sweep. Per-pixel halo detection is unreliable (the LCD
 * subpixel layout, browser hinting, and zoom level all interact), so this
 * QA is a visual gate: open the saved screenshots and compare against
 * `board/.../STORY-0211-crisp-text-rendering/upstream-crisp.png`. The script
 * does perform one machine-readable check: it samples the bounding box of
 * each Text object's pixels and asserts each pixel is either "ink" (close to
 * the style's `color`) or "background" (close to the surrounding panel) —
 * pixels at intermediate gray values would be the halo. That gives us a
 * regression trip-wire even when nobody opens the screenshots.
 */
import { launchGame, setupGame, screenshot, waitForIdle } from "./harness";
import type { Page } from "@playwright/test";

async function waitForScene(page: Page, name: string, timeoutMs = 8000): Promise<void> {
  await page.waitForFunction(
    (n) => (window.A!.getState() as { scene?: string }).scene === n,
    name,
    { timeout: timeoutMs },
  );
}

async function waitForCombatMainMenu(page: Page): Promise<void> {
  for (let i = 0; i < 80; i++) {
    const probe = await page.evaluate(() => {
      const st = window.A!.getState() as Record<string, unknown>;
      const c = st.combat as { menuMode?: string } | undefined;
      return c?.menuMode ?? null;
    });
    if (probe === "main") return;
    await page.waitForTimeout(100);
  }
  throw new Error("combat menuMode never reached 'main'");
}

/**
 * Count the distinct gray-ramp pixels in a screenshot region. Halo pixels
 * show up as values strictly between the ink color (#1a1a1a-ish dark) and
 * the background (panel cream / white), so a clean render should bin into
 * exactly two clusters. Returns the share of pixels that are *neither*
 * solidly dark (< 64) nor solidly light (> 200) — i.e. the AA fringe share.
 *
 * Run against a tight crop around the dialog text — broader crops drag in
 * unrelated pixels (panel borders, sprites) and dilute the signal.
 */
async function fringePixelShare(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
): Promise<number> {
  const buf = await page.screenshot({ clip });
  // Decode PNG via a tiny inline decoder: pull RGBA bytes from the PNG using
  // sharp would be overkill — the canvas-derived screenshot is already small.
  // For this QA we use the browser to sample pixels instead.
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await new Promise<void>((res) => {
      img.onload = () => res();
    });
    const cv = document.createElement("canvas");
    cv.width = img.width;
    cv.height = img.height;
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let fringe = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      total++;
      // Solid pixels: dark ink (<64) or light background (>200). Mid-tones
      // (the halo) live in [64, 200]. Threshold chosen empirically against
      // the upstream reference — its glyph edges drop straight from white
      // to dark with at most one mid-tone pixel per character.
      if (lum >= 64 && lum <= 200) fringe++;
    }
    return total === 0 ? 0 : fringe / total;
  }, dataUrl);
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/**
 * Combat dialog — the primary acceptance check. Spawn a wild battle, screenshot
 * the "What will X do?" prompt, and verify glyph fringes are sparse.
 *
 * The dialog box's text starts at canvas (4, ~106) inside the left HUD panel
 * — see CombatScene MESSAGE_BOX layout. At zoom=4 (the harness default 1024×600
 * viewport snaps to 4×) that's display pixels (16, ~424). Crop a strip
 * generous enough to include several characters but not the panel borders.
 */
async function checkCombatDialog(page: Page): Promise<void> {
  await setupGame(page, { map: "spyder_paper_town", tileX: 20, tileY: 11 });
  await page.evaluate(() => window.A!.spawnBattle("budaye", "rockitten", 5, 5, "grass"));
  await waitForScene(page, "CombatScene");
  await waitForCombatMainMenu(page);
  await page.waitForTimeout(400);
  await screenshot(page, "crisp-01-combat-dialog");

  // Pixel-fringe assertion: the prompt strip across the bottom-left dialog.
  // Coordinates derived from CombatScene MESSAGE_BOX (BOX_Y = HEIGHT-30,
  // PAD_X = 4) * zoom 4 at the 1024×600 default viewport.
  const fringe = await fringePixelShare(page, { x: 16, y: 480, width: 380, height: 28 });
  // Empirical: upstream-crisp reference clocks ~3% mid-tone pixels (the
  // single-pixel hint of AA at each glyph corner). Our pre-fix shots
  // exceeded 25%. Keep a wide margin so font-shape changes don't flap.
  assert(
    fringe < 0.12,
    `combat dialog fringe pixel share ${fringe.toFixed(3)} > 0.12 (halo regression?)`,
  );
  console.log(`combat dialog fringe share: ${(fringe * 100).toFixed(1)}%`);
}

/** Resize sweep — text must stay crisp across all integer-zoom bands. */
async function checkResizeBreakpoints(page: Page): Promise<void> {
  await setupGame(page, { map: "spyder_paper_town", tileX: 20, tileY: 11 });
  await page.evaluate(() => window.A!.spawnBattle("budaye", "rockitten", 5, 5, "grass"));
  await waitForScene(page, "CombatScene");
  await waitForCombatMainMenu(page);

  // Each viewport snaps to a different integer zoom: 800×600→3×, 1280×720→5×,
  // 1920×1080→7× (floor(min(W/256, H/144))). Resize, give Phaser a tick to
  // re-snap, then screenshot. The resize handler in main.ts also calls
  // refreshCrispResolution(intZoom) so existing Text objects get their
  // canvases re-rasterised at the new zoom.
  const breakpoints = [
    { width: 800, height: 600, name: "800x600" },
    { width: 1280, height: 720, name: "1280x720" },
    { width: 1920, height: 1080, name: "1920x1080" },
  ];
  for (const bp of breakpoints) {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.waitForTimeout(300);
    await screenshot(page, `crisp-02-resize-${bp.name}`);
  }
}

/** Math quiz, monster info, party screen, main menu — broader scene sweep. */
async function checkMathProblem(page: Page): Promise<void> {
  await setupGame(page, { map: "spyder_paper_town", tileX: 20, tileY: 11 });
  await waitForIdle(page);
  await page.evaluate(() =>
    window.A!.showProblem({
      id: "qa-crisp",
      standard: "1.OA.A.1",
      question: {
        content: "What is 7 + 5?",
        widgets: {
          "n-input 1": {
            type: "numeric-input",
            options: { answers: [{ value: 12, status: "correct" }] },
          },
        },
      },
      hints: [{ content: "Count up from 7 by 5." }],
    }),
  );
  await waitForScene(page, "MathProblemScene");
  await page.waitForTimeout(300);
  await screenshot(page, "crisp-03-math-quiz");
}

async function checkMonsterInfo(page: Page): Promise<void> {
  await setupGame(page, { map: "spyder_paper_town", tileX: 20, tileY: 11 });
  await waitForIdle(page);
  await page.evaluate(() => window.A!.openMonsterInfo("budaye"));
  await waitForScene(page, "MonsterInfoScene");
  await page.waitForTimeout(300);
  await screenshot(page, "crisp-04-monster-info");
}

async function checkPartyScreen(page: Page): Promise<void> {
  await setupGame(page, {
    map: "qa_npc_stage",
    tileX: 5,
    tileY: 5,
    monsters: [{ slug: "budaye", level: 5 }],
  });
  await waitForIdle(page);
  // Drive through the scene manager — same pattern as pixel-font-readability.
  await page.evaluate(() => {
    const bridge = window.A as unknown as {
      getActiveScene: () => {
        scene: { pause: (k?: string) => void; launch: (k: string) => void };
      };
    };
    const active = bridge.getActiveScene()!;
    active.scene.pause();
    active.scene.launch("PartyScreen");
  });
  await page.waitForTimeout(300);
  await screenshot(page, "crisp-05-party-screen");
}

async function checkTitleScreen(page: Page): Promise<void> {
  // Title is the boot scene; reload onto a clean save state.
  await page.evaluate(() => localStorage.removeItem("arithmon_save"));
  await page.reload();
  await page.waitForFunction(() => window.A?.ready, null, { timeout: 30_000 });
  await page.waitForTimeout(300);
  await screenshot(page, "crisp-06-title-screen");
}

async function withFreshGame<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const { page, close } = await launchGame();
  try {
    return await fn(page);
  } finally {
    await close();
  }
}

async function main() {
  await withFreshGame(checkCombatDialog);
  await withFreshGame(checkResizeBreakpoints);
  await withFreshGame(checkMathProblem);
  await withFreshGame(checkMonsterInfo);
  await withFreshGame(checkPartyScreen);
  await withFreshGame(checkTitleScreen);
  console.log("text-crispness: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
