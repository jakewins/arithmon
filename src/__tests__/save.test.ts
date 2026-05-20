import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearSave, hasSave, loadGame, saveGame } from "../game/save";
import { session } from "../game/session";

// In-memory localStorage shim for vitest's node environment. save.ts wraps
// every storage call in try/catch, but we want the actual round-trip
// behaviour exercised here.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

afterEach(() => {
  delete (globalThis as unknown as { localStorage?: MemoryStorage }).localStorage;
});

describe("save helpers", () => {
  it("hasSave returns false when no save exists", () => {
    expect(hasSave()).toBe(false);
  });

  it("hasSave returns true after saveGame", () => {
    saveGame();
    expect(hasSave()).toBe(true);
  });

  it("clearSave removes the persisted save", () => {
    saveGame();
    expect(hasSave()).toBe(true);
    clearSave();
    expect(hasSave()).toBe(false);
  });

  it("clearSave resets in-memory session to defaults", () => {
    // Mutate session state to simulate a partial playthrough
    session.player.name = "Frodo";
    session.player.money = 9999;
    session.player.gameVariables.set("scenario_choice", "spyder_campaign");
    session.skillEncounter = 42;

    clearSave();

    expect(session.player.name).toBe("Player");
    expect(session.player.money).toBe(500);
    expect(session.player.gameVariables.has("scenario_choice")).toBe(false);
    expect(session.skillEncounter).toBe(0);
  });

  it("clearSave followed by loadGame yields no resume", () => {
    saveGame();
    clearSave();
    expect(loadGame()).toBeNull();
  });
});
