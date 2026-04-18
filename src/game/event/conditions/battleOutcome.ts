import type { EventCondition, EventContext } from "../types";
import { registerCondition } from "../registry";

class BattleOutcomeCondition implements EventCondition {
  type = "battle_outcome";

  private npcSlug: string;
  private expectedOutcome: string;

  constructor(args: string[]) {
    // Syntax: battle_outcome player,npc_slug,outcome  e.g. "player,dante,won"
    this.npcSlug = args[1] ?? args[0];
    this.expectedOutcome = args[2] ?? args[1];
  }

  test(ctx: EventContext): boolean {
    const outcome = ctx.session.battleOutcomes.get(this.npcSlug);
    return outcome === this.expectedOutcome;
  }
}

registerCondition("battle_outcome", (args) => new BattleOutcomeCondition(args));
