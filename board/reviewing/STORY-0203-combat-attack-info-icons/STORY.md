# STORY-0203: Combat attack info — element & range icon artwork

## Description

Polish the combat attack-info card built in **STORY-0202** by replacing the plain text element/range labels with upstream Tuxemon's pixel-art icons. The reference screenshot lives next to this story at `upstream-combat-ui.png` — that is the visual target.

Specifically:

- **Element icon** — the small green leaf next to "Recharge 2 turns" in the screenshot. Render this on the info card based on `technique.element`.
- **Range badge** — the colored "RANGED" pill in the screenshot. Render this in place of the plain-text MELEE/RANGED label from STORY-0202.
- **Tiny element marker next to each technique name** in the popup (optional, but matches some upstream layouts). Confirm visually whether the upstream screenshot includes this — if not, skip.

This story is the **artwork** half of the combat-menu work. STORY-0202 must be merged before this story starts, since this story touches the info-card labels added there.

**Depends on**: STORY-0202 (combat menu 3-panel layout — adds the info card and `renderInfoCard` helper this story builds on).

Currently relevant code: `src/game/scenes/CombatScene.ts` — specifically the `renderInfoCard` helper and the techniques-popup label rendering, both added in STORY-0202.

Upstream reference: `upstream/tuxemon/states/combat_menus.py:445-507` — the `show()` closure shows where upstream loads `gfx/ui/icons/element/{slug}_type_small.png` and `gfx/ui/icons/range/{range}.png`.

## Visual target

See `upstream-combat-ui.png` in this story's directory. Specifically, the bottom-left info card showing Poison Courtship's details:

- "Accuracy 85%" — top of card
- "RANGED" — rendered as a yellow/orange pill badge with a stylized border
- "Power 15" — next to the range badge
- "Recharge 2 turns" — bottom of card
- Small green leaf icon to the right — the wood element (it's Poison Courtship but wood-colored in this build's palette; the point is the icon position)

## Available upstream assets

All asset files we need already exist in `upstream/mods/tuxemon/gfx/ui/icons/`:

- **Element icons** (small variant): `element/{slug}_type_small.png` — one per element. Our `ELEMENT_SLUGS` in `src/game/data/elements.ts` all have matching `_small.png` files in upstream: cosmic, earth, fire, frost, heroic, lightning, metal, normal, shadow, sky, venom, water, wood.
- **Range icons**: `range/melee.png`, `range/ranged.png`, plus `reach.png`, `reliable.png`, `special.png`, `touch.png`. Our `TechniqueDef.range` is only `melee | ranged`, so the other range files can be left in the asset pool unused for now.

## Todos

Work through these in order. Each can be a separate commit. After every todo, screenshot via puppeteer and visually diff against `upstream-combat-ui.png`.

1. [Import icon assets](todos/open/01-import-icon-assets.md) — copy the element `_small` PNGs and range PNGs into `public/assets/`
2. [Preload icons in CombatScene](todos/open/02-preload-icons.md) — register textures in `preload()`
3. [Render element icon on info card](todos/open/03-element-icon.md) — show the technique's element icon at the correct spot
4. [Render range badge on info card](todos/open/04-range-badge.md) — replace the plain "MELEE"/"RANGED" text with the upstream range icon
5. [Puppeteer QA across elements](todos/open/05-puppeteer-qa.md) — spawn battles with monsters of every element, screenshot info cards, confirm icons render correctly

## Acceptance criteria

- [ ] Every element used in `src/game/data/elements.ts` has a corresponding small icon asset under `public/assets/ui/combat/icons/element/`
- [ ] Both range icons (`melee.png`, `ranged.png`) live under `public/assets/ui/combat/icons/range/`
- [ ] The attack info card shows the element icon at a position roughly matching `upstream-combat-ui.png`
- [ ] The "MELEE"/"RANGED" text from STORY-0202 is replaced with the corresponding range icon
- [ ] All techniques in `src/game/data/techniques.ts` render without missing-texture warnings (covers every `element` × `range` combo that we actually use)
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
- [ ] Puppeteer screenshot of the FIGHT submenu visibly matches `upstream-combat-ui.png` — both layout (from STORY-0202) and icon artwork (from this story)
