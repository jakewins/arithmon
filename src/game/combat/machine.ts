import { Monster } from "../model/Monster";
import { TECHNIQUES, type TechniqueDef } from "../data/techniques";
import { calculateDamage, rollAccuracy, rollFleeChance } from "./formula";
import { debugBridge } from "../debug";

export type CombatState = "INTRO" | "DECISION" | "ACTION" | "RESOLVE" | "END";
export type PlayerAction = { type: "fight"; technique: string } | { type: "run" };
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
    | "dp_empty";
  message: string;
}

export const MAX_DARK_POWER = 5;

export class CombatMachine {
  readonly player: Monster;
  readonly enemy: Monster;
  state: CombatState = "INTRO";
  outcome: CombatOutcome | null = null;
  darkPower: number = MAX_DARK_POWER;
  readonly maxDarkPower: number = MAX_DARK_POWER;
  private fleeAttempts = 0;

  constructor(player: Monster, enemy: Monster) {
    this.player = player;
    this.enemy = enemy;
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
    debugBridge.emit("combat_state", { from, to: this.state });
    return [{ type: "intro", message: `A wild ${this.enemy.name} appeared!` }];
  }

  submitAction(action: PlayerAction): CombatEvent[] {
    if (this.state !== "DECISION") return [];

    const fromState = this.state;
    this.state = "ACTION";
    debugBridge.emit("combat_state", { from: fromState, to: this.state });
    const events: CombatEvent[] = [];

    if (action.type === "run") {
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
        events.push({
          type: "faint",
          message: `${this.enemy.name} fainted!`,
        });
        this.state = "END";
        this.outcome = "win";
        debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
        debugBridge.emit("combat_action", { action, events });
        return events;
      }
    }

    // Enemy turn
    events.push(...this.performAttack(this.enemy, this.player, false));
    if (this.player.currentHp <= 0) {
      events.push({
        type: "faint",
        message: `${this.player.name} fainted!`,
      });
      this.state = "END";
      this.outcome = "lose";
      debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
      debugBridge.emit("combat_action", { action, events });
      return events;
    }

    this.state = "DECISION";
    debugBridge.emit("combat_state", { from: "ACTION", to: this.state });
    debugBridge.emit("combat_action", { action, events });
    return events;
  }

  private performAttack(
    attacker: Monster,
    defender: Monster,
    isPlayer: boolean,
    tech?: TechniqueDef,
  ): CombatEvent[] {
    const events: CombatEvent[] = [];
    const technique = tech ?? attacker.techniques[0];
    const label = isPlayer ? "player_attack" : "enemy_attack";

    events.push({
      type: label,
      message: `${attacker.name} uses ${technique.name}!`,
    });

    if (!rollAccuracy(technique.accuracy)) {
      events.push({ type: "miss", message: "It missed!" });
      return events;
    }

    const damage = calculateDamage(attacker, technique, defender);
    defender.currentHp = Math.max(0, defender.currentHp - damage);
    events.push({
      type: "damage",
      message: `${defender.name} took ${damage} damage!`,
    });

    return events;
  }
}
