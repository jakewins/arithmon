import { type PerseusProblem, type GradeResult } from "./data/problems";
import { generate as generateKOAA5 } from "./data/skills/k-oa-a5";
import { generate as generateKOAA2 } from "./data/skills/k-oa-a2";
import { generate as generateKOAA4 } from "./data/skills/k-oa-a4";
import { generate as generateKOAA3 } from "./data/skills/k-oa-a3";
import { generate as generateKNBTA1 } from "./data/skills/k-nbt-a1";
import { generate as generate1OAC6 } from "./data/skills/1-oa-c6";
import { generate as generate1OAB4 } from "./data/skills/1-oa-b4";
import { generate as generate1OAD7 } from "./data/skills/1-oa-d7";
import { generate as generate1OAD8 } from "./data/skills/1-oa-d8";
import { generate as generate1NBTB2 } from "./data/skills/1-nbt-b2";
import { generate as generate1OAA1 } from "./data/skills/1-oa-a1";
import { generate as generate1NBTB3 } from "./data/skills/1-nbt-b3";
import { generate as generate1NBTC5 } from "./data/skills/1-nbt-c5";
import { generate as generate1NBTC4 } from "./data/skills/1-nbt-c4";
import { session, type GameSession, type SkillState } from "./session";

export type { SkillState };

/** Union of all skill node IDs currently handled by the game. */
export type SkillNodeId =
  | "K.OA.A.5"
  | "K.OA.A.2"
  | "K.OA.A.4"
  | "K.OA.A.3"
  | "K.NBT.A.1"
  | "1.OA.C.6"
  | "1.OA.B.4"
  | "1.OA.D.7"
  | "1.OA.D.8"
  | "1.NBT.B.2"
  | "1.OA.A.1"
  | "1.NBT.B.3"
  | "1.NBT.C.5"
  | "1.NBT.C.4";

export interface SkillNode<Id extends string = SkillNodeId> {
  id: Id;
  /** IDs of prerequisite nodes that must be at box >= 2 to unlock this node. */
  prerequisites: Id[];
  /** Generates a problem for this skill. */
  generate: () => PerseusProblem;
}

const BOX_WEIGHT = [1, 2, 4, 8, 16] as const;

/**
 * Manages math problem selection using Leitner spaced-repetition.
 *
 * All mutable state lives in the provided GameSession so it can be
 * serialized alongside the rest of the game state.
 */
export class SkillTree<Id extends string = SkillNodeId> {
  private nodes: Map<Id, SkillNode<Id>> = new Map();
  private session: GameSession;
  private activeProblem: PerseusProblem | null = null;
  private activeProblemNodeId: Id | null = null;

  constructor(session: GameSession) {
    this.session = session;
  }

  register(node: SkillNode<Id>): void {
    this.nodes.set(node.id, node);
    if (!(node.id in this.session.skillStates)) {
      this.session.skillStates[node.id] = { box: 0, lastSeen: 0 };
    }
  }

  /**
   * Re-seed `session.skillStates` with a fresh entry for every registered
   * node, and reset the encounter counter. Called by `clearSave()` after
   * `resetSession()` replaces `session.skillStates` with a fresh `{}` — the
   * existing registrations would otherwise leave the new object empty, and
   * `getNextProblem()` would throw a TypeError on the first call.
   */
  reseed(): void {
    for (const id of this.nodes.keys()) {
      this.session.skillStates[id] = { box: 0, lastSeen: 0 };
    }
    this.session.skillEncounter = 0;
    this.activeProblem = null;
    this.activeProblemNodeId = null;
  }

  /** Returns true if a node is unlocked (all prerequisites at box >= 2). */
  isUnlocked(nodeId: Id): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    return node.prerequisites.every((prereq) => {
      const s = this.session.skillStates[prereq];
      return s !== undefined && s.box >= 2;
    });
  }

  /** Returns the skill state for a node, or undefined if not registered. */
  getState(nodeId: Id): SkillState | undefined {
    return this.session.skillStates[nodeId];
  }

  /** Returns the current global encounter counter. */
  getEncounter(): number {
    return this.session.skillEncounter;
  }

  getNextProblem(): PerseusProblem {
    this.session.skillEncounter++;

    const candidates: { nodeId: Id; priority: number }[] = [];
    for (const [nodeId] of this.nodes) {
      if (!this.isUnlocked(nodeId)) continue;
      const s = this.session.skillStates[nodeId];
      const encountersSinceLastSeen = this.session.skillEncounter - s.lastSeen;
      const priority = encountersSinceLastSeen / BOX_WEIGHT[s.box];
      candidates.push({ nodeId, priority });
    }

    // Sort descending by priority; ties broken randomly
    candidates.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return Math.random() - 0.5;
    });

    const chosen = candidates[0];
    if (!chosen) {
      throw new Error("No unlocked skill nodes available");
    }

    const node = this.nodes.get(chosen.nodeId)!;
    const s = this.session.skillStates[chosen.nodeId];
    s.lastSeen = this.session.skillEncounter;

    this.activeProblem = node.generate();
    this.activeProblemNodeId = chosen.nodeId;
    return this.activeProblem;
  }

  gradeAnswer(problemId: string, answer: number | string | [number, number]): GradeResult {
    const problem = this.activeProblem?.id === problemId ? this.activeProblem : null;
    if (!problem) {
      return { correct: false, expected: 0 };
    }

    const widget = Object.values(problem.question.widgets)[0];
    let correct: boolean;
    let expected: number | string | [number, number];

    if (widget.type === "number-line") {
      expected = widget.options.answer;
      correct = answer === expected;
    } else if (widget.type === "comparison") {
      expected = widget.options.answer;
      correct = answer === expected;
    } else if (widget.type === "radio") {
      const correctChoice = widget.options.choices.find((c) => c.correct);
      expected = correctChoice?.content ?? "";
      correct = answer === expected;
    } else if (widget.type === "dropdown") {
      const correctChoice = widget.options.choices.find((c) => c.correct);
      expected = correctChoice?.content ?? "";
      correct = answer === expected;
    } else if (widget.type === "dual-input") {
      const [exp0, exp1] = widget.options.answers;
      expected = [exp0.value, exp1.value];
      correct = Array.isArray(answer) && answer[0] === exp0.value && answer[1] === exp1.value;
    } else {
      const correctAnswer = widget.options.answers.find((a) => a.status === "correct");
      expected = correctAnswer?.value ?? 0;
      correct = answer === expected;
    }

    // Update Leitner state
    if (this.activeProblemNodeId) {
      const s = this.session.skillStates[this.activeProblemNodeId];
      if (s) {
        if (correct) {
          s.box = Math.min(s.box + 1, 4);
        } else {
          s.box = 0;
        }
      }
    }

    return { correct, expected };
  }
}

export function createSkillTree(gameSession: GameSession): SkillTree {
  const tree = new SkillTree(gameSession);

  // Register the K.OA.A.5 node (no prerequisites — it's the starting skill)
  tree.register({
    id: "K.OA.A.5",
    prerequisites: [],
    generate: generateKOAA5,
  });

  // Register K.OA.A.2 — unlocks once K.OA.A.5 reaches box >= 2
  tree.register({
    id: "K.OA.A.2",
    prerequisites: ["K.OA.A.5"],
    generate: generateKOAA2,
  });

  // Register K.OA.A.4 — unlocks once K.OA.A.2 reaches box >= 2
  tree.register({
    id: "K.OA.A.4",
    prerequisites: ["K.OA.A.2"],
    generate: generateKOAA4,
  });

  // Register K.OA.A.3 — unlocks once K.OA.A.2 reaches box >= 2
  tree.register({
    id: "K.OA.A.3",
    prerequisites: ["K.OA.A.2"],
    generate: generateKOAA3,
  });

  // Register K.NBT.A.1 — unlocks once both K.OA.A.3 and K.OA.A.4 reach box >= 2
  tree.register({
    id: "K.NBT.A.1",
    prerequisites: ["K.OA.A.3", "K.OA.A.4"],
    generate: generateKNBTA1,
  });

  // Register 1.OA.C.6 — unlocks once K.OA.A.2 reaches box >= 2
  tree.register({
    id: "1.OA.C.6",
    prerequisites: ["K.OA.A.2"],
    generate: generate1OAC6,
  });

  // Register 1.OA.B.4 — unlocks once 1.OA.C.6 reaches box >= 2
  tree.register({
    id: "1.OA.B.4",
    prerequisites: ["1.OA.C.6"],
    generate: generate1OAB4,
  });

  // Register 1.OA.D.7 — unlocks once 1.OA.C.6 reaches box >= 2
  tree.register({
    id: "1.OA.D.7",
    prerequisites: ["1.OA.C.6"],
    generate: generate1OAD7,
  });

  // Register 1.OA.D.8 — unlocks once 1.OA.C.6 reaches box >= 2
  tree.register({
    id: "1.OA.D.8",
    prerequisites: ["1.OA.C.6"],
    generate: generate1OAD8,
  });

  // Register 1.NBT.B.2 — unlocks once K.NBT.A.1 reaches box >= 2
  tree.register({
    id: "1.NBT.B.2",
    prerequisites: ["K.NBT.A.1"],
    generate: generate1NBTB2,
  });

  // Register 1.NBT.B.3 — unlocks once 1.NBT.B.2 reaches box >= 2
  tree.register({
    id: "1.NBT.B.3",
    prerequisites: ["1.NBT.B.2"],
    generate: generate1NBTB3,
  });

  // Register 1.NBT.C.5 — unlocks once 1.NBT.B.2 reaches box >= 2
  tree.register({
    id: "1.NBT.C.5",
    prerequisites: ["1.NBT.B.2"],
    generate: generate1NBTC5,
  });

  // Register 1.NBT.C.4 — unlocks once both 1.NBT.B.2 and 1.OA.C.6 reach box >= 2
  tree.register({
    id: "1.NBT.C.4",
    prerequisites: ["1.NBT.B.2", "1.OA.C.6"],
    generate: generate1NBTC4,
  });

  // Register 1.OA.A.1 — unlocks once both 1.OA.C.6 and 1.OA.D.8 reach box >= 2
  tree.register({
    id: "1.OA.A.1",
    prerequisites: ["1.OA.C.6", "1.OA.D.8"],
    generate: generate1OAA1,
  });

  return tree;
}

/** Module-level singleton — backed by the game session. */
export const skillTree = createSkillTree(session);
