import { Monster } from "../model/Monster";
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

  submitAction(action: PlayerAction): CombatEvent[] {
    if (this.state !== "DECISION") return [];

    const fromState = this.state;
    this.state = "ACTION";
    debugBridge.emit("combat_state", { from: fromState, to: this.state });
    const events: CombatEvent[] = [];

    if (action.type === "run") {
      if (!this.isWild) {
        events.push({
          type: "flee_fail",
          message: "Can't escape from a trainer battle!",
        });
        this.state = "DECISION";
        debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
        debugBridge.emit("combat_action", { action, events });
        return events;
      }
      this.fleeAttempts++;
      if (rollFleeChance(this.fleeAttempts, this.player.level, this.enemy.level)) {
        events.push({
          type: "flee_success",
          message: "Got away safely!",
        });
        this.state = "END";
        this.outcome = "fled";
        debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
        debugBridge.emit("combat_action", { action, events });
        return events;
      }
      events.push({
        type: "flee_fail",
        message: "Couldn't escape!",
      });
    } else if (action.type === "swap") {
      const target = this.party[action.partyIndex];
      if (!target || target.fainted || target === this.player) {
        this.state = "DECISION";
        debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
        return [];
      }
      const oldName = this.player.name;
      // Returning monster keeps no stages; the incoming one starts fresh.
      this.player.resetStatStages();
      this.player = target;
      this.player.resetStatStages();
      events.push({
        type: "swap_out",
        message: `${oldName}, come back!`,
      });
      events.push({
        type: "swap_in",
        message: `Go, ${this.player.name}!`,
      });
    } else if (action.type === "item") {
      events.push(...this.processItemAction(action.itemSlug, action.targetIndex));
    } else if (action.type === "capture") {
      if (!this.isWild) {
        events.push({
          type: "capture_fail",
          message: "Can't use that in a trainer battle!",
        });
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
    } else {
      const technique = TECHNIQUES[action.technique];
      if (!technique) throw new Error(`Unknown technique: ${action.technique}`);
      this.darkPower = Math.max(0, this.darkPower - technique.dpCost);
      events.push({
        type: "dp_drain",
        message: `${technique.dpCost} Dark Power spent! (${this.darkPower}/${this.maxDarkPower})`,
      });
      events.push(...this.performAttack(this.player, this.enemy, true, technique));
      if (this.enemy.currentHp <= 0) {
        return this.handleEnemyFaint(events, action);
      }
    }

    // Enemy turn — trainers pick a random technique, wild monsters use their first
    const enemyTech = !this.isWild
      ? this.enemy.techniques[Math.floor(Math.random() * this.enemy.techniques.length)]
      : undefined;
    events.push(...this.performAttack(this.enemy, this.player, false, enemyTech));
    if (this.player.currentHp <= 0) {
      return this.handlePlayerFaint(events, action);
    }
    if (this.enemy.currentHp <= 0) {
      // Enemy could KO itself via a self-targeted effect or e.g. recoil. Treat
      // as a win, same as the player-turn KO branch above.
      return this.handleEnemyFaint(events, action);
    }

    // End-of-turn: tick statuses on both monsters and emit damage logs.
    events.push(...this.tickEndOfTurn());
    if (this.enemy.currentHp <= 0) {
      return this.handleEnemyFaint(events, action);
    }
    if (this.player.currentHp <= 0) {
      return this.handlePlayerFaint(events, action);
    }

    this.state = "DECISION";
    debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
    debugBridge.emit("combat_action", { action, events });
    return events;
  }

  private handlePlayerFaint(events: CombatEvent[], action: PlayerAction): CombatEvent[] {
    events.push({
      type: "faint",
      message: `${this.player.name} fainted!`,
    });
    if (this.hasSwapTargets()) {
      this.state = "FORCE_SWAP";
      events.push({
        type: "force_swap",
        message: "Choose a monster to send out!",
      });
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
    events.push({
      type: "faint",
      message: `${this.enemy.name} fainted!`,
    });
    events.push(...this.awardXp());

    const nextEnemy = this.enemyParty.find((m) => m !== this.enemy && !m.fainted);
    if (nextEnemy) {
      this.enemy = nextEnemy;
      this.enemy.resetStatStages();
      events.push({
        type: "swap_in",
        message: this.trainerName
          ? `${this.trainerName} sent out ${nextEnemy.name}!`
          : `A new ${nextEnemy.name} appeared!`,
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

    this.player = target;
    this.player.resetStatStages();
    const events: CombatEvent[] = [{ type: "swap_in", message: `Go, ${this.player.name}!` }];

    this.state = "DECISION";
    debugBridge.emit("combat_state", { from: "FORCE_SWAP", to: this.state });
    debugBridge.emit("combat_action", { action: { type: "swap", partyIndex }, events });
    return events;
  }

  private processItemAction(itemSlug: string, targetIndex: number): CombatEvent[] {
    const itemDef = ITEMS[itemSlug];
    if (!itemDef) throw new Error(`Unknown item: ${itemSlug}`);
    const target = this.party[targetIndex];
    if (!target) throw new Error(`No monster at party index ${targetIndex}`);

    const events: CombatEvent[] = [];
    events.push({ type: "item_used", message: `Used ${itemDef.name}!` });

    for (const effect of itemDef.effects) {
      events.push(...this.applyItemEffect(effect, target));
    }

    removeItem(this.inventory, itemSlug);
    return events;
  }

  private applyItemEffect(effect: ItemEffect, target: Monster): CombatEvent[] {
    switch (effect.type) {
      case "heal_hp": {
        const before = target.currentHp;
        target.currentHp = Math.min(target.maxHp, target.currentHp + effect.amount);
        const healed = target.currentHp - before;
        return [{ type: "item_heal", message: `${target.name} recovered ${healed} HP!` }];
      }
      case "heal_hp_percent": {
        const before = target.currentHp;
        const amount = Math.floor(target.maxHp * (effect.percent / 100));
        target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
        const healed = target.currentHp - before;
        return [{ type: "item_heal", message: `${target.name} recovered ${healed} HP!` }];
      }
      case "revive": {
        const restored = Math.floor(target.maxHp * (effect.hp_percent / 100));
        target.currentHp = restored;
        return [
          { type: "item_revive", message: `${target.name} was revived with ${restored} HP!` },
        ];
      }
      case "capture":
        return [];
    }
  }

  private processCaptureAction(itemSlug: string): CombatEvent[] {
    const itemDef = ITEMS[itemSlug];
    if (!itemDef) throw new Error(`Unknown item: ${itemSlug}`);

    const events: CombatEvent[] = [];
    events.push({ type: "item_used", message: `You threw a ${itemDef.name}!` });
    removeItem(this.inventory, itemSlug);

    const captureEffect = itemDef.effects.find((e) => e.type === "capture");
    const ballModifier = captureEffect?.type === "capture" ? captureEffect.modifier : 1.0;

    const sv = shakeCheck(this.enemy, ballModifier);
    const result = attemptCapture(sv);

    for (let i = 0; i < result.shakes; i++) {
      events.push({ type: "capture_shake", message: "Shake..." });
    }

    if (result.success) {
      events.push({
        type: "capture_success",
        message: `Gotcha! ${this.enemy.name} was caught!`,
      });
      events.push(...this.awardXp());
      if (this.onCapture) {
        this.onCapture(this.enemy);
      }
      this.state = "END";
      this.outcome = "win";
      debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
    } else {
      events.push({
        type: "capture_fail",
        message: `${this.enemy.name} broke free!`,
      });
    }

    return events;
  }

  private awardXp(): CombatEvent[] {
    const events: CombatEvent[] = [];
    const enemyDef = MONSTERS[this.enemy.slug];
    const xp = calculateXpReward(this.enemy.level, enemyDef.baseXpYield);
    events.push({
      type: "xp_gain",
      message: `${this.player.name} gained ${xp} XP!`,
    });
    debugBridge.emit("xp_gained", { monster: this.player.slug, xp });

    const levelUps = this.player.addXp(xp);
    for (const lu of levelUps) {
      events.push({
        type: "level_up",
        message: `${this.player.name} grew to Lv ${lu.newLevel}!`,
      });
      debugBridge.emit("level_up", {
        monster: this.player.slug,
        level: lu.newLevel,
        oldStats: lu.oldStats,
        newStats: lu.newStats,
      });
      for (const move of lu.newMoves) {
        events.push({
          type: "move_learned",
          message: `${this.player.name} learned ${move.name}!`,
        });
        debugBridge.emit("move_learned", { monster: this.player.slug, move: move.slug });
      }
    }

    return events;
  }

  private performAttack(
    attacker: Monster,
    defender: Monster,
    isPlayer: boolean,
    tech?: TechniqueDef,
  ): CombatEvent[] {
    const technique = tech ?? attacker.techniques[0];
    const events: CombatEvent[] = [];

    // Sleep / other action-gating statuses: skip the attack entirely.
    const gating = gatesAction(attacker);
    if (gating) {
      const def = STATUSES[gating.slug];
      events.push({
        type: "status_gated",
        message: `${attacker.name} is ${def.displayName.toLowerCase()}!`,
      });
      return events;
    }

    const label = isPlayer ? "player_attack" : "enemy_attack";
    const executorEvents = executeTechnique(attacker, defender, technique, isPlayer);
    for (const ev of executorEvents) {
      events.push(mapExecutorEvent(ev, label));
    }
    return events;
  }

  /**
   * End-of-turn pass: tick every active status on both monsters, decrement
   * durations, and emit events.
   */
  private tickEndOfTurn(): CombatEvent[] {
    const events: CombatEvent[] = [];
    for (const monster of [this.player, this.enemy]) {
      const statusEvents = tickStatuses(monster);
      for (const se of statusEvents) {
        events.push({ type: se.type, message: se.message });
      }
    }
    return events;
  }
}

function mapExecutorEvent(
  ev: ExecutorEvent,
  attackLabel: "player_attack" | "enemy_attack",
): CombatEvent {
  switch (ev.type) {
    case "attack_use":
      return { type: attackLabel, message: ev.message };
    case "miss":
      return { type: "miss", message: ev.message };
    case "damage":
      return { type: "damage", message: ev.message };
    case "effectiveness":
      return { type: "effectiveness", message: ev.message };
    case "status_apply":
      return { type: "status_apply", message: ev.message };
    case "status_resist":
      return { type: "status_apply", message: ev.message };
    case "heal":
      return { type: "heal", message: ev.message };
    case "stat_stage":
      return { type: "stat_stage", message: ev.message };
  }
}
