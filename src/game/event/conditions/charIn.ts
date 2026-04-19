import type { EventCondition } from "../types";
import { registerCondition } from "../registry";

class CharInCondition implements EventCondition {
  type = "char_in";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_args: string[]) {}

  test(): boolean {
    // Stub: no surfable tiles implemented yet
    return false;
  }
}

registerCondition("char_in", (args) => new CharInCondition(args));
