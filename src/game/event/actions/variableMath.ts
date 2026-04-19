import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";

class VariableMathAction implements EventAction {
  type = "variable_math";
  done = false;

  private varName: string;
  private operator: string;
  private operand: number;

  constructor(args: string[]) {
    // Format: player,variable_name,operator,operand
    const [, varName, operator, operand] = args;
    this.varName = varName;
    this.operator = operator;
    this.operand = Number(operand);
  }

  start(ctx: EventContext): void {
    const current = Number(ctx.variables.get(this.varName) ?? "0");
    let result: number;
    switch (this.operator) {
      case "+":
        result = current + this.operand;
        break;
      case "-":
        result = current - this.operand;
        break;
      case "*":
        result = current * this.operand;
        break;
      case "/":
        result = this.operand !== 0 ? current / this.operand : current;
        break;
      default:
        result = current;
    }
    ctx.variables.set(this.varName, String(result));
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("variable_math", (args) => new VariableMathAction(args));
