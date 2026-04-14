import { Monster } from "../model/Monster";
import { calculateDamage, rollAccuracy, rollFleeChance } from "./formula";

export type CombatState = "INTRO" | "DECISION" | "ACTION" | "RESOLVE" | "END";
export type PlayerAction = "fight" | "run";
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
    const technique = this.player.techniques[0];
    return technique != null && this.darkPower >= technique.dpCost;
  }

  rechargeDarkPower(): void {
    this.darkPower = this.maxDarkPower;
  }

  intro(): CombatEvent[] {
    this.state = "DECISION";
    return [{ type: "intro", message: `A wild ${this.enemy.name} appeared!` }];
  }

  submitAction(action: PlayerAction): CombatEvent[] {
    if (this.state !== "DECISION") return [];

    this.state = "ACTION";
    const events: CombatEvent[] = [];

    if (action === "run") {
      this.fleeAttempts++;
      if (rollFleeChance(this.fleeAttempts, this.player.level, this.enemy.level)) {
        events.push({
          type: "flee_success",
          message: "Got away safely!",
        });
        this.state = "END";
        this.outcome = "fled";
        return events;
      }
      events.push({
        type: "flee_fail",
        message: "Couldn't escape!",
      });
    } else {
      const technique = this.player.techniques[0];
      this.darkPower = Math.max(0, this.darkPower - technique.dpCost);
      events.push({
        type: "dp_drain",
        message: `${technique.dpCost} Dark Power spent! (${this.darkPower}/${this.maxDarkPower})`,
      });
      events.push(...this.performAttack(this.player, this.enemy, true));
      if (this.enemy.currentHp <= 0) {
        events.push({
          type: "faint",
          message: `${this.enemy.name} fainted!`,
        });
        this.state = "END";
        this.outcome = "win";
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
      return events;
    }

    this.state = "DECISION";
    return events;
  }

  private performAttack(attacker: Monster, defender: Monster, isPlayer: boolean): CombatEvent[] {
    const events: CombatEvent[] = [];
    const technique = attacker.techniques[0];
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
