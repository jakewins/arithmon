import type { GameVariables } from "./types";

class GameVariablesImpl implements GameVariables {
  private store = new Map<string, string>();

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  remove(key: string): void {
    this.store.delete(key);
  }
}

export const gameVariables: GameVariables = new GameVariablesImpl();
