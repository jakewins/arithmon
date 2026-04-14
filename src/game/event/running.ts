import type { EventAction, EventContext, EventDef, ActionDef } from "./types";
import { createAction } from "./registry";

export class RunningEvent {
  readonly def: EventDef;
  private actions: ActionDef[];
  private currentIndex = 0;
  private currentAction: EventAction | null = null;
  private _done = false;

  constructor(def: EventDef) {
    this.def = def;
    this.actions = def.actions;
  }

  get done(): boolean {
    return this._done;
  }

  /** Returns true while a multi-frame action is blocking (e.g. dialog). */
  get blocking(): boolean {
    return this.currentAction !== null && !this.currentAction.done;
  }

  step(ctx: EventContext, dt: number): void {
    // Process actions — single-frame actions advance immediately in the same frame
    while (!this._done) {
      if (this.currentAction === null) {
        // Start next action
        if (this.currentIndex >= this.actions.length) {
          this._done = true;
          return;
        }
        const actionDef = this.actions[this.currentIndex];
        this.currentAction = createAction(actionDef.type, actionDef.args);
        this.currentAction.start(ctx);
      }

      if (this.currentAction.done) {
        // Action completed — clean up and advance
        this.currentAction.cleanup(ctx);
        this.currentAction = null;
        this.currentIndex++;
        continue; // try next action this frame
      }

      // Action still running — update and yield
      this.currentAction.update(ctx, dt);

      if (this.currentAction.done) {
        this.currentAction.cleanup(ctx);
        this.currentAction = null;
        this.currentIndex++;
        continue; // try next action this frame
      }

      // Multi-frame action still in progress — yield until next frame
      return;
    }
  }
}
