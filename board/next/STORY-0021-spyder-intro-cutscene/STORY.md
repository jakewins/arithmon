# STORY-0021: Spyder Intro Cutscene

## Description

Implement the spyder campaign intro sequence that plays when the player first arrives in `spyder_bedroom` after character creation. This is a multi-step cutscene with dialog, background images, and monster showcases, ending with a teleport to `spyder_paper_scoop`.

### Upstream events

From `spyder_bedroom.yaml`:

```yaml
Intro Question:
  actions:
  - translated_dialog spyder_intro_question
  - translated_dialog_choice no:yes,question_intro
  conditions:
  - not variable_set question_intro:yes
  - not variable_set question_intro:no
  type: event

No Intro:
  actions:
  - set_variable spyder_intro:yes
  - transition_teleport player,spyder_paper_scoop.tmx,4,8,0.3
  - char_face player,right
  conditions:
  - is variable_set question_intro:yes
  - not variable_set spyder_intro:yes
  type: event

Spyder Intro:
  actions:
  - change_bg_char gradient_blue,spyder_omnichannel_beaverbrook
  - translated_dialog spyder_intro00
  - change_bg gradient_blue,spyder_tumble,image
  - translated_dialog spyder_intro01
  - change_bg_monster gradient_blue,dollfin
  - translated_dialog dollfin,,,center,center
  - change_bg_monster gradient_blue,ignibus
  - translated_dialog ignibus,,,center,center
  - change_bg_monster gradient_blue,memnomnom
  - translated_dialog memnomnom,,,center,center
  - change_bg_monster gradient_blue,budaye
  - translated_dialog budaye,,,center,center
  - change_bg_monster gradient_blue,grintot
  - translated_dialog grintot,,,center,center
  - change_bg gradient_blue,spyder_monsters,image
  - translated_dialog spyder_intro02
  - change_bg gradient_blue,spyder_morph,image
  - translated_dialog spyder_intro03
  - set_variable spyder_intro:yes
  - transition_teleport player,spyder_paper_scoop.tmx,4,8,0.3
  - char_face player,right
  conditions:
  - is variable_set question_intro:no
  - not variable_set spyder_intro:yes
  type: event
```

### Flow

1. On first visit (no `question_intro` variable set), **Intro Question** fires: asks if player wants to see the intro
2. If they say **yes** (`question_intro:no` — counterintuitive but that's how upstream keys the choice: the variable stores the answer to "skip?"), **Spyder Intro** fires: a narrated slideshow introducing the spyder world, showcasing monsters, then teleporting to `spyder_paper_scoop`
3. If they say **no** (`question_intro:yes`), **No Intro** fires: skips straight to `spyder_paper_scoop`

### Tasks

1. **Implement `change_bg_char` action**
   - `change_bg_char gradient_blue,spyder_omnichannel_beaverbrook` — sets background colour and overlays an NPC/character sprite
   - Similar to existing `change_bg` with image overlay, but uses a character spritesheet instead of a UI background image
   - The character sprite `spyder_omnichannel_beaverbrook` needs to be fetched from upstream (`mods/tuxemon/gfx/sprites/`) and registered

2. **Implement `change_bg_monster` action**
   - `change_bg_monster gradient_blue,dollfin` — sets background and overlays a monster sprite
   - Monster sprites need fetching from upstream Tuxemon (`mods/tuxemon/gfx/sprites/battle/`)
   - Monsters shown: `dollfin`, `ignibus`, `memnomnom`, `budaye`, `grintot`

3. **Handle `translated_dialog` positional args**
   - `translated_dialog dollfin,,,center,center` — the 4th and 5th args control text positioning
   - STORY-0019 implements basic `translated_dialog`; this story extends it to support positional arguments (or ignore them gracefully)

4. **Export `spyder_paper_scoop` map**
   - Fetch `spyder_paper_scoop.tmx` from upstream Tuxemon repo
   - Export with: `tiled --export-map --embed-tilesets mods/tuxemon/maps/spyder_paper_scoop.tmx public/assets/maps/spyder_paper_scoop.json`
   - Strip tileset image paths, copy any new tileset PNGs
   - Register in `src/game/data/maps.ts`

5. **Fetch required image assets**
   - Character sprite: `spyder_omnichannel_beaverbrook` (from `mods/tuxemon/gfx/sprites/`)
   - Background images: `spyder_tumble`, `spyder_monsters`, `spyder_morph` (from `mods/tuxemon/gfx/ui/background/`)
   - Monster battle sprites for the five monsters listed above (from `mods/tuxemon/gfx/sprites/battle/`)
   - Register all in the preloader

6. **Add intro events to `spyder_bedroom.yaml`** (if not already present)

7. **Tests**
   - `change_bg_char` and `change_bg_monster` actions register and execute
   - Intro question flow: choosing yes/no sets correct variables and triggers correct follow-up event

## Dependencies

- STORY-0018 (loads `spyder_bedroom.yaml`, coordinate fix)
- STORY-0019 (`translated_dialog` action)

## Acceptance Criteria

- [ ] On first visit to `spyder_bedroom`, the intro question dialog appears
- [ ] Choosing to see the intro plays the full slideshow with character/monster backgrounds
- [ ] Choosing to skip the intro teleports directly to `spyder_paper_scoop`
- [ ] On subsequent visits, the intro does not replay (variables are persisted in session)
- [ ] `spyder_paper_scoop` map loads and renders correctly
- [ ] All checks pass (`npm run format:check && npm run lint && npx tsc --noEmit && npm test`)
