# STORY-0006: Dark Power Combat Integration

## Description

Introduce "Dark Power" (DP) as a consumable combat resource that fuels techniques and is recharged by solving math problems mid-battle. This connects the math skill tree to the combat loop, creating the core gameplay hook: solve math → gain power → attack monsters.

### Design

- **Dark Power pool**: Each combat starts with a full bar of 5 DP.
- **Technique costs**: Each technique has a `dpCost` (e.g., Ram costs 2 DP). Attacking deducts from the pool. If you can't afford a technique, the FIGHT button is disabled/greyed.
- **Recharging**: Clicking the DP bar (or a dedicated "RECHARGE" button) when it's not full launches the MathProblemScene. Solving the problem correctly refills the DP bar to max. Getting it wrong returns to combat with no refill.
- **DP is combat-local**: Tracked on `CombatMachine`, reset each battle. No global persistence needed.

### Architecture — Scene Transitions

Following the Tuxemon pattern (stack-based state pausing), the flow is:

```
CombatScene (pauses)
  → launches MathProblemScene with { returnScene: "CombatScene" }
  → MathProblemScene emits result via scene event before stopping
  → CombatScene resumes via shutdown listener, reads result
```

No global state needed. CombatScene listens for the MathProblemScene `shutdown` event and checks the result. This mirrors how OverworldScene already handles CombatScene shutdown.

Concretely:
1. CombatScene calls `this.scene.pause()` then `this.scene.launch("MathProblemScene")`
2. MathProblemScene stores its result on a scene-level property (e.g., `this.data.set("correct", true)`)
3. CombatScene listens: `this.scene.get("MathProblemScene").events.once("shutdown", () => { ... })` and reads the result from the MathProblemScene's data manager or a registry property

### Tasks

1. **Add `dpCost` to techniques** — Extend `TechniqueDef` in `data/techniques.ts` with a `dpCost: number` field. Ram gets `dpCost: 2`.

2. **Add Dark Power tracking to CombatMachine** — New fields: `darkPower: number` (current), `maxDarkPower: number` (5). `submitAction("fight")` deducts `dpCost` and emits a `"dp_drain"` event. Add a `rechargeDarkPower()` method that sets DP to max.

3. **Render the DP bar in CombatScene** — Display 5 pip icons or a segmented bar near the player's HP bar. Update after each action. Make it clickable — clicking when DP < max triggers the math recharge flow.

4. **Wire up the recharge flow** — Clicking the DP bar pauses CombatScene, launches MathProblemScene. On return: if correct, call `machine.rechargeDarkPower()` and update the bar. If wrong, resume combat with no change. Gate the FIGHT button: disable it when `darkPower < technique.dpCost`.

5. **Update MathProblemScene to signal its result** — Instead of always returning to OverworldScene, accept a `returnScene` parameter. Store the grading result so the calling scene can read it on shutdown.

## Acceptance Criteria

- [ ] `TechniqueDef` has a `dpCost` field; Ram costs 2 DP
- [ ] `CombatMachine` tracks `darkPower` (starts at 5, max 5)
- [ ] Using a technique deducts its `dpCost` from the pool
- [ ] FIGHT button is disabled when `darkPower < technique.dpCost`
- [ ] DP bar/pips are rendered in CombatScene near the player info
- [ ] Clicking the DP bar when DP < max launches MathProblemScene
- [ ] Correct answer refills DP to max and returns to combat
- [ ] Wrong answer returns to combat with no DP change
- [ ] MathProblemScene works from both overworld ("P" key) and combat (recharge flow)
- [ ] Combat state (HP, turn, etc.) is fully preserved across the math screen detour
