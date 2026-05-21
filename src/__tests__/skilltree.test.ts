import { describe, expect, it, beforeEach } from "vitest";
import { SkillTree, type SkillNode } from "../game/skilltree";
import type { GameSession } from "../game/session";

type TestId = "A" | "B" | "C";

function makeSession(): GameSession {
  return {
    player: {
      name: "Test",
      gender: null,
      template: "adventurer",
      monsters: [],
      inventory: new Map(),
      money: 500,
      gameVariables: {
        get: () => undefined,
        set: () => {},
        has: () => false,
        remove: () => {},
        toRecord: () => ({}),
      },
    },
    skillStates: {},
    skillEncounter: 0,
    monsterStorage: [],
    monsterRegistry: { seen: new Set(), caught: new Set() },
    battleOutcomes: new Map(),
    npcParties: new Map(),
    bills: {},
    environment: "grass",
    inside: false,
    locationType: "",
    mapKey: "",
    mapMeta: null,
    timeStage: "day",
    kennels: { Kennel: { monsters: [], visible: true } },
    musicPlaying: null,
  };
}

function makeGenerator(standard: string) {
  let counter = 0;
  return () => ({
    id: `${standard}-${++counter}`,
    standard,
    question: {
      content: `What is $1 + 1$?\n\n[[☃ numeric-input 1]]`,
      widgets: {
        "numeric-input 1": {
          type: "numeric-input" as const,
          options: { answers: [{ value: 2, status: "correct" as const }] },
        },
      },
    },
    hints: [{ content: "The answer is 2." }],
  });
}

describe("SkillTree Leitner progression", () => {
  let session: GameSession;
  let tree: SkillTree<TestId>;
  let nodeA: SkillNode<TestId>;

  beforeEach(() => {
    session = makeSession();
    tree = new SkillTree<TestId>(session);
    nodeA = { id: "A", prerequisites: [], generate: makeGenerator("A") };
    tree.register(nodeA);
  });

  it("starts nodes at box 0", () => {
    expect(tree.getState("A")).toEqual({ box: 0, lastSeen: 0 });
  });

  it("stores state in the session object", () => {
    expect(session.skillStates["A"]).toEqual({ box: 0, lastSeen: 0 });
    const p = tree.getNextProblem();
    tree.gradeAnswer(p.id, 2);
    expect(session.skillStates["A"].box).toBe(1);
    expect(session.skillEncounter).toBe(1);
  });

  it("correct answer advances box by 1", () => {
    const problem = tree.getNextProblem();
    tree.gradeAnswer(problem.id, 2);
    expect(tree.getState("A")!.box).toBe(1);
  });

  it("incorrect answer resets box to 0", () => {
    for (let i = 0; i < 2; i++) {
      const p = tree.getNextProblem();
      tree.gradeAnswer(p.id, 2);
    }
    expect(tree.getState("A")!.box).toBe(2);

    const p = tree.getNextProblem();
    tree.gradeAnswer(p.id, 999);
    expect(tree.getState("A")!.box).toBe(0);
  });

  it("box caps at 4", () => {
    for (let i = 0; i < 10; i++) {
      const p = tree.getNextProblem();
      tree.gradeAnswer(p.id, 2);
    }
    expect(tree.getState("A")!.box).toBe(4);
  });

  it("updates lastSeen on each getNextProblem call", () => {
    tree.getNextProblem();
    expect(tree.getState("A")!.lastSeen).toBe(1);
    tree.getNextProblem();
    expect(tree.getState("A")!.lastSeen).toBe(2);
  });

  it("locked nodes are skipped", () => {
    const nodeB: SkillNode<TestId> = {
      id: "B",
      prerequisites: ["A"],
      generate: makeGenerator("B"),
    };
    tree.register(nodeB);

    for (let i = 0; i < 10; i++) {
      const problem = tree.getNextProblem();
      expect(problem.standard).toBe("A");
    }
  });

  it("unlocks node when prerequisites reach box >= 2", () => {
    const nodeB: SkillNode<TestId> = {
      id: "B",
      prerequisites: ["A"],
      generate: makeGenerator("B"),
    };
    tree.register(nodeB);

    for (let i = 0; i < 2; i++) {
      const p = tree.getNextProblem();
      tree.gradeAnswer(p.id, 2);
    }
    expect(tree.getState("A")!.box).toBe(2);
    expect(tree.isUnlocked("B")).toBe(true);

    // B has lastSeen=0 so it should have higher priority than A
    const problem = tree.getNextProblem();
    expect(problem.standard).toBe("B");
  });

  it("prioritizes nodes not seen recently over well-known nodes", () => {
    const nodeB: SkillNode<TestId> = {
      id: "B",
      prerequisites: [],
      generate: makeGenerator("B"),
    };
    tree.register(nodeB);

    const p1 = tree.getNextProblem();
    tree.gradeAnswer(p1.id, 2);
    const firstStandard = p1.standard;

    const p2 = tree.getNextProblem();
    expect(p2.standard).not.toBe(firstStandard);
  });

  it("throws when no unlocked nodes exist", () => {
    const emptyTree = new SkillTree<TestId>(makeSession());
    expect(() => emptyTree.getNextProblem()).toThrow("No unlocked skill nodes available");
  });

  // Regression for STORY-0204: TitleScene's "New Game" runs
  // clearSave() -> resetSession(), which `Object.assign(session, fresh)`
  // replaces session.skillStates with a fresh {} — wiping the entries
  // register() set up at module load. getNextProblem() would then read
  // an undefined entry and throw TypeError on .lastSeen. The fix re-seeds
  // states via skillTree.reseed() inside clearSave(); this test exercises
  // reseed() directly so the unit-test layer also covers the failure mode.
  it("reseed() restores state entries after session.skillStates is replaced", () => {
    // Mimic Object.assign(session, fresh) blowing away skillStates while
    // the existing SkillTree instance keeps its registered nodes.
    session.skillStates = {};
    session.skillEncounter = 42;

    // Without reseed(), getNextProblem() crashes with TypeError on
    // `s.lastSeen`. We assert it instead succeeds after reseed().
    tree.reseed();

    expect(session.skillStates["A"]).toEqual({ box: 0, lastSeen: 0 });
    expect(session.skillEncounter).toBe(0);
    expect(() => tree.getNextProblem()).not.toThrow();
  });

  it("node with multiple prerequisites only unlocks when all are met", () => {
    const nodeB: SkillNode<TestId> = {
      id: "B",
      prerequisites: [],
      generate: makeGenerator("B"),
    };
    const nodeC: SkillNode<TestId> = {
      id: "C",
      prerequisites: ["A", "B"],
      generate: makeGenerator("C"),
    };
    tree.register(nodeB);
    tree.register(nodeC);

    // Advance A to box 2, B still at 0
    for (let i = 0; i < 2; i++) {
      const p = tree.getNextProblem();
      if (p.standard === "A") {
        tree.gradeAnswer(p.id, 2);
      }
    }

    expect(tree.isUnlocked("C")).toBe(false);
  });
});
