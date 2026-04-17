import { type PerseusProblem, type GradeResult } from "./data/problems";
import { generate as generateKOAA5 } from "./data/skills/k-oa-a5";
import { generate as generateKOAA2 } from "./data/skills/k-oa-a2";
import { session, type GameSession, type SkillState } from "./session";

export type { SkillState };

/** Union of all skill node IDs currently handled by the game. */
export type SkillNodeId = "K.OA.A.5" | "K.OA.A.2";

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

  gradeAnswer(problemId: string, answer: number | string): GradeResult {
    const problem = this.activeProblem?.id === problemId ? this.activeProblem : null;
    if (!problem) {
      return { correct: false, expected: 0 };
    }

    const widget = Object.values(problem.question.widgets)[0];
    let correct: boolean;
    let expected: number | string;

    if (widget.type === "radio") {
      const correctChoice = widget.options.choices.find((c) => c.correct);
      expected = correctChoice?.content ?? "";
      correct = answer === expected;
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

  return tree;
}

/** Module-level singleton — backed by the game session. */
export const skillTree = createSkillTree(session);
