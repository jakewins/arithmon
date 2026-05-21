import { Monster, type LevelUpSummary } from "../model/Monster";
import { MONSTERS } from "../data/monsters";
import { TECHNIQUES, type TechniqueDef } from "../data/techniques";
import { ITEMS } from "../data/items";
import { type Inventory, removeItem } from "../item/inventory";
import { type ItemEffect } from "../item/item";
import { calculateXpReward, rollFleeChance, shakeCheck, attemptCapture } from "./formula";
import { executeTechnique, type ExecutorEvent } from "./techniqueExecutor";
import { gatesAction, tickStatuses } from "./statusHandler";
import { STATUSES } from "../data/statuses";
import { debugBridge } from "../debug";

export type CombatState = "INTRO" | "DECISION" | "ACTION" | "RESOLVE" | "FORCE_SWAP" | "END";
export type PlayerAction =
  | { type: "fight"; technique: string }
  | { type: "run" }
  | { type: "swap"; partyIndex: number }
  | { type: "item"; itemSlug: string; targetIndex: number }
  | { type: "capture"; itemSlug: string };
export type CombatOutcome = "win" | "lose" | "fled";

/**
 * One narration step in a combat turn.
 *
 * STORY-0233: each event carries an optional `apply` closure that performs
 * the *visible* model mutation tied to this step — HP drop, status push,
 * DP drain, XP credit, capture-callback fire, faint, sprite swap, etc.
 * The CombatScene runs `apply()` at the moment it shows `message`, keeping
 * the on-screen HUD (HP bar tween, DP pips, party tray, sprite swap) in
 * lockstep with narration. `submitAction` does NOT mutate visible model
 * state during turn resolution — every observable change is captured in
 * one of these closures.
 *
 * State-machine flips (`state`, `outcome`) DO happen synchronously inside
 * `submitAction` — only the player-visible effects are gated. This matches
 * upstream's pattern where the combat-state machine knows the outcome
 * before the text-anim queue finishes playing.
 *
 * Pure narration events (e.g. `intro`, `miss`, `effectiveness`, `flee_fail`,
 * `force_swap`, `dp_empty`) leave `apply` undefined.
 */
export interface CombatEvent {
  type:
    | "intro"
    | "player_attack"
    | "enemy_attack"
    | "damage"
    | "miss"
    | "faint"
    | "flee_success"
    | "flee_fail"
    | "dp_drain"
    | "dp_empty"
    | "swap_out"
    | "swap_in"
    | "force_swap"
    | "xp_gain"
    | "level_up"
    | "move_learned"
    | "item_used"
    | "item_heal"
    | "item_revive"
    | "capture_shake"
    | "capture_success"
    | "capture_fail"
    | "effectiveness"
    | "status_apply"
    | "status_tick"
    | "status_wear_off"
    | "status_gated"
    | "heal"
    | "stat_stage";
  message: string;
  /**
   * On `level_up` events only, the LAST per-level event of a grant carries
   * the aggregated `LevelUpSummary` (start→end level, before/after stats).
   * CombatScene reads this off the dequeued event and shows the popup once
   * the end-of-battle message has displayed.
   */
  levelUpSummary?: LevelUpSummary;
  /**
   * STORY-0233: visible-state mutation deferred until narration reveals
   * `message`. Undefined for pure-narration events. Idempotency is the
   * caller's responsibility — `apply` is invoked exactly once per event.
   */
  apply?: () => void;
}

export const MAX_DARK_POWER = 5;

export class CombatMachine {
  player: Monster;
  enemy: Monster;
  readonly enemyParty: Monster[];
  readonly party: Monster[];
  readonly inventory: Inventory;
  readonly isWild: boolean;
  /** Display name for trainer battles (e.g. "Silver"). */
  readonly trainerName: string | null;
  /** Callback invoked on successful capture to add the monster to party/storage. */
  onCapture: ((monster: Monster) => void) | null = null;
  state: CombatState = "INTRO";
  outcome: CombatOutcome | null = null;
  darkPower: number;
  readonly maxDarkPower: number = MAX_DARK_POWER;
  private fleeAttempts = 0;

  constructor(
    player: Monster,
    enemy: Monster,
    party?: Monster[],
    inventory?: Inventory,
    isWild = true,
    enemyParty?: Monster[],
    trainerName?: string,
    initialDarkPower: number = MAX_DARK_POWER,
  ) {
    this.player = player;
    this.enemy = enemy;
    this.enemyParty = enemyParty ?? [enemy];
    this.party = party ?? [player];
    this.inventory = inventory ?? new Map();
    this.isWild = isWild;
    this.trainerName = trainerName ?? null;
    this.darkPower = initialDarkPower;
  }

  canFight(): boolean {
    return this.player.techniques.some((t) => this.darkPower >= t.dpCost);
  }

  canAfford(technique: TechniqueDef): boolean {
    return this.darkPower >= technique.dpCost;
  }

  rechargeDarkPower(): void {
    this.darkPower = this.maxDarkPower;
  }

  intro(): CombatEvent[] {
    const from = this.state;
    this.state = "DECISION";
    // Stat stages are battle-local — start each combat fresh.
    for (const m of [...this.party, ...this.enemyParty]) {
      m.resetStatStages();
    }
    debugBridge.emit("combat_state", { from, to: this.state });
    const message = this.trainerName
      ? `Trainer ${this.trainerName} wants to battle!`
      : `A wild ${this.enemy.name} appeared!`;
    return [{ type: "intro", message }];
  }

  /** Check if a party index is valid for swapping to. */
  canSwapTo(partyIndex: number): boolean {
    const target = this.party[partyIndex];
    if (!target) return false;
    if (target === this.player) return false;
    if (target.fainted) return false;
    return true;
  }

  /** Returns true if the party has non-fainted monsters other than the active one. */
  hasSwapTargets(): boolean {
    return this.party.some((m) => m !== this.player && !m.fainted);
  }

  /**
   * Resolve a turn into a sequence of `CombatEvent`s. Visible model state
   * (HP, status, totalXp, darkPower, `this.player`/`this.enemy` pointers,
   * capture callback) is NOT mutated here — each event carries an `apply`
   * closure that CombatScene runs in lockstep with narration (STORY-0233).
   *
   * State-machine fields (`state`, `outcome`) DO flip synchronously here;
   * only the player-visible effects are gated on narration.
   *
   * Branches that today read post-mutation model state (e.g. "did enemy
   * faint mid-turn? → skip counter-attack") consult *projected* HP
   * tracked in local variables. The same numbers are baked into the
   * per-event `apply` closures so the live model lands on them when
   * the narrator drains the queue.
   */
  submitAction(action: PlayerAction): CombatEvent[] {
    if (this.state !== "DECISION") return [];

    const fromState = this.state;
    this.state = "ACTION";
    debugBridge.emit("combat_state", { from: fromState, to: this.state });
    const events: CombatEvent[] = [];
    // Projected HP for the currently-active player monster, threaded
    // through any heals queued before the enemy counter. Defaults to the
    // live currentHp; an item heal targeting the active monster will
    // bump it.
    let projectedActivePlayerHp: number = this.player.currentHp;

    if (action.type === "run") {
      if (!this.isWild) {
        events.push({ type: "flee_fail", message: "Can't escape from a trainer battle!" });
        this.state = "DECISION";
        debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
        debugBridge.emit("combat_action", { action, events });
        return events;
      }
      this.fleeAttempts++;
      if (rollFleeChance(this.fleeAttempts, this.player.level, this.enemy.level)) {
        events.push({ type: "flee_success", message: "Got away safely!" });
        this.state = "END";
        this.outcome = "fled";
        debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
        debugBridge.emit("combat_action", { action, events });
        return events;
      }
      events.push({ type: "flee_fail", message: "Couldn't escape!" });
      // Falls through into enemy turn.
    } else if (action.type === "swap") {
      const target = this.party[action.partyIndex];
      if (!target || target.fainted || target === this.player) {
        this.state = "DECISION";
        debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
        return [];
      }
      const oldPlayer = this.player;
      events.push({
        type: "swap_out",
        message: `${oldPlayer.name}, come back!`,
        apply: () => {
          oldPlayer.resetStatStages();
        },
      });
      events.push({
        type: "swap_in",
        message: `Go, ${target.name}!`,
        apply: () => {
          this.player = target;
          target.resetStatStages();
        },
      });
      // Falls through into enemy turn — the enemy attacks the new active.
    } else if (action.type === "item") {
      const itemResult = this.processItemAction(action.itemSlug, action.targetIndex);
      events.push(...itemResult.events);
      // If the item targeted the active player monster, remember the post-
      // heal HP so the enemy counter below decides KO branching against
      // the projected value (matches old eager-mutation behaviour).
      if (itemResult.target === this.player) {
        projectedActivePlayerHp = itemResult.projectedHp;
      }
    } else if (action.type === "capture") {
      if (!this.isWild) {
        events.push({ type: "capture_fail", message: "Can't use that in a trainer battle!" });
        this.state = "DECISION";
        debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
        debugBridge.emit("combat_action", { action, events });
        return events;
      }
      const captureEvents = this.processCaptureAction(action.itemSlug);
      events.push(...captureEvents);
      if (this.outcome !== null) {
        debugBridge.emit("combat_action", { action, events });
        return events;
      }
      // Capture failed → enemy counter-attack continues below.
    } else {
      // type === "fight"
      const technique = TECHNIQUES[action.technique];
      if (!technique) throw new Error(`Unknown technique: ${action.technique}`);
      const cost = technique.dpCost;
      const newDp = Math.max(0, this.darkPower - cost);
      events.push({
        type: "dp_drain",
        message: `${cost} Dark Power spent! (${newDp}/${this.maxDarkPower})`,
        apply: () => {
          this.darkPower = newDp;
        },
      });
      const attackResult = this.performAttack(this.player, this.enemy, true, technique);
      events.push(...attackResult.events);
      if (attackResult.projectedDefenderHp <= 0) {
        return this.handleEnemyFaint(events, action);
      }
    }

    // Enemy turn. The enemy targets `this.player` (the live pointer)
    // because by the time enemy-attack narrates, any swap_in event will
    // have already fired its apply. We can resolve the "defender at enemy
    // turn" up front: if a swap_in is queued earlier in `events`, the
    // defender is the new target; otherwise it's still `this.player`.
    const defenderAtEnemyTurn = this.resolveActivePlayerAfter(events);
    const enemyTech = !this.isWild
      ? this.enemy.techniques[Math.floor(Math.random() * this.enemy.techniques.length)]
      : undefined;
    // If a pre-enemy-turn heal landed on the active monster, use that
    // projected HP for the counter-attack so the enemy doesn't decide a
    // KO against the stale pre-heal value.
    const defenderHpBefore =
      defenderAtEnemyTurn === this.player ? projectedActivePlayerHp : defenderAtEnemyTurn.currentHp;
    const enemyAttackResult = this.performAttack(
      this.enemy,
      defenderAtEnemyTurn,
      false,
      enemyTech,
      this.enemy.currentHp,
      defenderHpBefore,
    );
    events.push(...enemyAttackResult.events);

    let projectedPlayerHp = enemyAttackResult.projectedDefenderHp;
    let projectedEnemyHp = enemyAttackResult.projectedAttackerHp;

    if (projectedPlayerHp <= 0) {
      return this.handlePlayerFaint(events, action, defenderAtEnemyTurn);
    }
    if (projectedEnemyHp <= 0) {
      // Enemy could KO itself via self-targeted recoil / draining moves
      // (future-proofing — none in data today).
      return this.handleEnemyFaint(events, action);
    }

    // End-of-turn: tick statuses on both monsters.
    const tickResult = this.tickEndOfTurn(
      defenderAtEnemyTurn,
      this.enemy,
      projectedPlayerHp,
      projectedEnemyHp,
    );
    events.push(...tickResult.events);
    projectedPlayerHp = tickResult.projectedPlayerHp;
    projectedEnemyHp = tickResult.projectedEnemyHp;

    if (projectedEnemyHp <= 0) {
      return this.handleEnemyFaint(events, action);
    }
    if (projectedPlayerHp <= 0) {
      return this.handlePlayerFaint(events, action, defenderAtEnemyTurn);
    }

    this.state = "DECISION";
    debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
    debugBridge.emit("combat_action", { action, events });
    return events;
  }

  /**
   * If a swap_in event already sits in `events`, return the monster being
   * swapped in (extracted by name-match against the queue's last swap_in
   * message). Otherwise return the current active player.
   *
   * Used to point the enemy's counter-attack at whichever monster the
   * player will be looking at when narration reaches the enemy_attack
   * step.
   */
  private resolveActivePlayerAfter(events: CombatEvent[]): Monster {
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (ev.type === "swap_in") {
        const match = this.party.find((m) => ev.message === `Go, ${m.name}!`);
        if (match) return match;
      }
    }
    return this.player;
  }

  private handlePlayerFaint(
    events: CombatEvent[],
    action: PlayerAction,
    defender: Monster,
  ): CombatEvent[] {
    events.push({
      type: "faint",
      message: `${defender.name} fainted!`,
      // No apply: HP is already at 0 from the preceding damage/tick
      // closure. `fainted` is a getter on `currentHp <= 0`. The event
      // exists purely as a narration + party-tray repaint gate.
    });
    if (this.hasSwapTargets()) {
      this.state = "FORCE_SWAP";
      events.push({ type: "force_swap", message: "Choose a monster to send out!" });
      debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
      debugBridge.emit("combat_action", { action, events });
      return events;
    }
    this.state = "END";
    this.outcome = "lose";
    debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
    debugBridge.emit("combat_action", { action, events });
    return events;
  }

  private handleEnemyFaint(events: CombatEvent[], action: PlayerAction): CombatEvent[] {
    const fainter = this.enemy;
    events.push({ type: "faint", message: `${fainter.name} fainted!` });
    events.push(...this.awardXp());

    const nextEnemy = this.enemyParty.find((m) => m !== fainter && !m.fainted);
    if (nextEnemy) {
      events.push({
        type: "swap_in",
        message: this.trainerName
          ? `${this.trainerName} sent out ${nextEnemy.name}!`
          : `A new ${nextEnemy.name} appeared!`,
        apply: () => {
          this.enemy = nextEnemy;
          nextEnemy.resetStatStages();
        },
      });
      this.state = "DECISION";
      debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
      debugBridge.emit("combat_action", { action, events });
      return events;
    }

    this.state = "END";
    this.outcome = "win";
    debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
    debugBridge.emit("combat_action", { action, events });
    return events;
  }

  /** Forced swap after the active monster faints. Does NOT cost a turn. */
  submitForceSwap(partyIndex: number): CombatEvent[] {
    if (this.state !== "FORCE_SWAP") return [];

    const target = this.party[partyIndex];
    if (!target || target.fainted) return [];

    const events: CombatEvent[] = [
      {
        type: "swap_in",
        message: `Go, ${target.name}!`,
        apply: () => {
          this.player = target;
          target.resetStatStages();
        },
      },
    ];

    this.state = "DECISION";
    debugBridge.emit("combat_state", { from: "FORCE_SWAP", to: this.state });
    debugBridge.emit("combat_action", { action: { type: "swap", partyIndex }, events });
    return events;
  }

  private processItemAction(
    itemSlug: string,
    targetIndex: number,
  ): { events: CombatEvent[]; target: Monster; projectedHp: number } {
    const itemDef = ITEMS[itemSlug];
    if (!itemDef) throw new Error(`Unknown item: ${itemSlug}`);
    const target = this.party[targetIndex];
    if (!target) throw new Error(`No monster at party index ${targetIndex}`);

    const events: CombatEvent[] = [];
    events.push({ type: "item_used", message: `Used ${itemDef.name}!` });

    let projectedHp = target.currentHp;
    for (const effect of itemDef.effects) {
      const effectResult = this.applyItemEffect(effect, target, projectedHp);
      events.push(...effectResult.events);
      projectedHp = effectResult.projectedHp;
    }

    // Inventory removal is deferred onto the LAST event in the sequence so
    // it fires after narration completes its mini-sequence.
    const last = events[events.length - 1];
    const prevApply = last.apply;
    last.apply = () => {
      prevApply?.();
      removeItem(this.inventory, itemSlug);
    };
    return { events, target, projectedHp };
  }

  private applyItemEffect(
    effect: ItemEffect,
    target: Monster,
    projectedHp: number,
  ): { events: CombatEvent[]; projectedHp: number } {
    switch (effect.type) {
      case "heal_hp": {
        const healed = Math.min(effect.amount, target.maxHp - projectedHp);
        return {
          events: [
            {
              type: "item_heal",
              message: `${target.name} recovered ${healed} HP!`,
              apply: () => {
                target.currentHp = Math.min(target.maxHp, target.currentHp + healed);
              },
            },
          ],
          projectedHp: projectedHp + healed,
        };
      }
      case "heal_hp_percent": {
        const amount = Math.floor(target.maxHp * (effect.percent / 100));
        const healed = Math.min(amount, target.maxHp - projectedHp);
        return {
          events: [
            {
              type: "item_heal",
              message: `${target.name} recovered ${healed} HP!`,
              apply: () => {
                target.currentHp = Math.min(target.maxHp, target.currentHp + healed);
              },
            },
          ],
          projectedHp: projectedHp + healed,
        };
      }
      case "revive": {
        const restored = Math.floor(target.maxHp * (effect.hp_percent / 100));
        return {
          events: [
            {
              type: "item_revive",
              message: `${target.name} was revived with ${restored} HP!`,
              apply: () => {
                target.currentHp = restored;
              },
            },
          ],
          projectedHp: restored,
        };
      }
      case "capture":
        return { events: [], projectedHp };
    }
  }

  private processCaptureAction(itemSlug: string): CombatEvent[] {
    const itemDef = ITEMS[itemSlug];
    if (!itemDef) throw new Error(`Unknown item: ${itemSlug}`);

    const events: CombatEvent[] = [];
    events.push({
      type: "item_used",
      message: `You threw a ${itemDef.name}!`,
      apply: () => {
        removeItem(this.inventory, itemSlug);
      },
    });

    const captureEffect = itemDef.effects.find((e) => e.type === "capture");
    const ballModifier = captureEffect?.type === "capture" ? captureEffect.modifier : 1.0;

    const sv = shakeCheck(this.enemy, ballModifier);
    const result = attemptCapture(sv);

    for (let i = 0; i < result.shakes; i++) {
      events.push({ type: "capture_shake", message: "Shake..." });
    }

    if (result.success) {
      const capturedMonster = this.enemy;
      events.push({
        type: "capture_success",
        message: `Gotcha! ${this.enemy.name} was caught!`,
        apply: () => {
          if (this.onCapture) this.onCapture(capturedMonster);
        },
      });
      events.push(...this.awardXp());
      this.state = "END";
      this.outcome = "win";
      debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
    } else {
      events.push({ type: "capture_fail", message: `${this.enemy.name} broke free!` });
    }

    return events;
  }

  private awardXp(): CombatEvent[] {
    const events: CombatEvent[] = [];
    const recipient = this.player;
    const enemyDef = MONSTERS[this.enemy.slug];
    const xp = calculateXpReward(this.enemy.level, enemyDef.baseXpYield);

    // Predict the level-up plan against a sandbox clone so we know the
    // exact `level_up` / `move_learned` narration to queue. The live
    // monster's totalXp/stats/techniques are mutated by xp_gain.apply when
    // the narrator drains the queue.
    const { predictedLevelUps, predictedSummary } = predictLevelUps(recipient, xp);

    events.push({
      type: "xp_gain",
      message: `${recipient.name} gained ${xp} XP!`,
      apply: () => {
        recipient.addXp(xp);
        debugBridge.emit("xp_gained", { monster: recipient.slug, xp });
      },
    });

    const levelUpEvents: CombatEvent[] = [];
    for (const lu of predictedLevelUps) {
      const ev: CombatEvent = {
        type: "level_up",
        message: `${recipient.name} grew to Lv ${lu.newLevel}!`,
        apply: () => {
          debugBridge.emit("level_up", {
            monster: recipient.slug,
            level: lu.newLevel,
            oldStats: lu.oldStats,
            newStats: lu.newStats,
          });
        },
      };
      levelUpEvents.push(ev);
      events.push(ev);
      for (const move of lu.newMoves) {
        events.push({
          type: "move_learned",
          message: `${recipient.name} learned ${move.name}!`,
          apply: () => {
            debugBridge.emit("move_learned", { monster: recipient.slug, move: move.slug });
          },
        });
      }
    }

    // Stamp the aggregated summary onto the LAST `level_up` event only — we
    // don't want CombatScene to launch the popup once per crossed boundary.
    if (predictedSummary && levelUpEvents.length > 0) {
      levelUpEvents[levelUpEvents.length - 1].levelUpSummary = predictedSummary;
    }

    return events;
  }

  /**
   * Run a technique resolution. Returns the events plus projected
   * attacker/defender HP after all effects in the technique would have
   * applied. Events carry their own `apply` closures via executeTechnique;
   * branch decisions in `submitAction` consult the projected HP values
   * rather than the live model.
   */
  private performAttack(
    attacker: Monster,
    defender: Monster,
    isPlayer: boolean,
    tech?: TechniqueDef,
    attackerHpBefore?: number,
    defenderHpBefore?: number,
  ): { events: CombatEvent[]; projectedAttackerHp: number; projectedDefenderHp: number } {
    const technique = tech ?? attacker.techniques[0];
    const events: CombatEvent[] = [];
    let projectedAttackerHp = attackerHpBefore ?? attacker.currentHp;
    let projectedDefenderHp = defenderHpBefore ?? defender.currentHp;

    // Sleep / other action-gating statuses: skip the attack entirely.
    const gating = gatesAction(attacker);
    if (gating) {
      const def = STATUSES[gating.slug];
      events.push({
        type: "status_gated",
        message: `${attacker.name} is ${def.displayName.toLowerCase()}!`,
      });
      return { events, projectedAttackerHp, projectedDefenderHp };
    }

    const label = isPlayer ? "player_attack" : "enemy_attack";
    const executorEvents = executeTechnique(attacker, defender, technique, isPlayer);
    for (const ev of executorEvents) {
      events.push(mapExecutorEvent(ev, label));
      if (ev.type === "damage" && typeof ev.amount === "number") {
        projectedDefenderHp = Math.max(0, projectedDefenderHp - ev.amount);
      } else if (ev.type === "heal" && typeof ev.amount === "number") {
        // Heal effects in technique data always target the attacker today
        // (no enemy-targeted heals); when that changes ExecutorEvent will
        // need an explicit target ref.
        projectedAttackerHp = Math.min(attacker.maxHp, projectedAttackerHp + ev.amount);
      }
    }
    return { events, projectedAttackerHp, projectedDefenderHp };
  }

  /**
   * End-of-turn pass: preview tick events for both monsters and return
   * the projected post-tick HP for each. Mutations land in each event's
   * `apply` closure (from `tickStatuses`), wrapped through here.
   */
  private tickEndOfTurn(
    player: Monster,
    enemy: Monster,
    projectedPlayerHp: number,
    projectedEnemyHp: number,
  ): { events: CombatEvent[]; projectedPlayerHp: number; projectedEnemyHp: number } {
    const events: CombatEvent[] = [];
    for (const monster of [player, enemy]) {
      const statusEvents = tickStatuses(monster);
      for (const se of statusEvents) {
        if (se.type === "status_tick" && se.message === "") {
          // Quiet decrement (sleep mid-duration). Attach the mutation to
          // the previous queue event so the duration ticks down without
          // a visible narration step. If the queue is empty so far (first
          // monster, first status, no tick yet), the mutation is harmless
          // to fold onto the NEXT event for this monster — but to keep
          // things simple, just attach to whatever the last queued event
          // is, or push a tiny pre-event when there isn't one.
          if (events.length > 0) {
            const last = events[events.length - 1];
            const prev = last.apply;
            last.apply = () => {
              prev?.();
              se.apply();
            };
          } else {
            // Edge case — no preceding event to chain on. Drop a no-op
            // narration step with a 0 ms hold (CombatScene treats empty
            // messages as advance-immediately) carrying just the
            // decrement.
            events.push({ type: "status_tick", message: "", apply: se.apply });
          }
          continue;
        }
        const event: CombatEvent = {
          type: se.type,
          message: se.message,
          apply: se.apply,
        };
        events.push(event);
        if (se.type === "status_tick" && typeof se.damage === "number") {
          if (monster === player) {
            projectedPlayerHp = Math.max(0, projectedPlayerHp - se.damage);
          } else {
            projectedEnemyHp = Math.max(0, projectedEnemyHp - se.damage);
          }
        }
      }
    }
    return { events, projectedPlayerHp, projectedEnemyHp };
  }
}

function mapExecutorEvent(
  ev: ExecutorEvent,
  attackLabel: "player_attack" | "enemy_attack",
): CombatEvent {
  switch (ev.type) {
    case "attack_use":
      return { type: attackLabel, message: ev.message, apply: ev.apply };
    case "miss":
      return { type: "miss", message: ev.message, apply: ev.apply };
    case "damage":
      return { type: "damage", message: ev.message, apply: ev.apply };
    case "effectiveness":
      return { type: "effectiveness", message: ev.message, apply: ev.apply };
    case "status_apply":
      return { type: "status_apply", message: ev.message, apply: ev.apply };
    case "status_resist":
      return { type: "status_apply", message: ev.message, apply: ev.apply };
    case "heal":
      return { type: "heal", message: ev.message, apply: ev.apply };
    case "stat_stage":
      return { type: "stat_stage", message: ev.message, apply: ev.apply };
  }
}

/**
 * Predict the level-up plan for adding `xp` to `monster` without mutating
 * the live monster. Mirrors Monster.addXp's bookkeeping by running it on a
 * sandbox clone so we can pre-build the per-level narration events while
 * leaving the actual stat / move mutations to xp_gain.apply.
 */
function predictLevelUps(
  monster: Monster,
  xp: number,
): {
  predictedLevelUps: ReturnType<Monster["addXp"]>["levelUps"];
  predictedSummary: LevelUpSummary | null;
} {
  const clone = Monster.spawn(monster.slug, monster.level);
  clone.totalXp = monster.totalXp;
  clone.maxHp = monster.maxHp;
  clone.melee = monster.melee;
  clone.ranged = monster.ranged;
  clone.armor = monster.armor;
  clone.dodge = monster.dodge;
  clone.speed = monster.speed;
  clone.currentHp = monster.currentHp;
  clone.techniques = [...monster.techniques];
  const { levelUps, summary } = clone.addXp(xp);
  return { predictedLevelUps: levelUps, predictedSummary: summary };
}
