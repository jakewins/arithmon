import { parse } from "yaml";
import type { EventDef, ConditionDef, ActionDef } from "./types";

interface YamlEvent {
  conditions?: string[];
  actions?: string[];
  /** Behavior shorthand — either a single string or a list. Upstream uses lists. */
  behav?: string | string[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface YamlFile {
  events: Record<string, YamlEvent>;
}

function parseConditionString(s: string): ConditionDef {
  const parts = s.trim().split(/\s+/);
  const operator = parts[0] as "is" | "not";
  const type = parts[1];
  const rest = parts.slice(2).join(" ");
  const args = rest ? rest.split(",").map((a) => a.trim()) : [];
  return { operator, type, args };
}

function parseActionString(s: string): ActionDef {
  const spaceIdx = s.indexOf(" ");
  if (spaceIdx === -1) {
    return { type: s.trim(), args: [] };
  }
  const type = s.slice(0, spaceIdx).trim();
  const rest = s.slice(spaceIdx + 1).trim();
  const args = rest.split(",").map((a) => a.trim());
  return { type, args };
}

function expandBehavior(
  behav: string,
  existingActions: ActionDef[],
): { conditions: ConditionDef[]; actions: ActionDef[] } {
  const parts = behav.trim().split(/\s+/);
  const behavType = parts[0];
  const npcSlug = parts[1];

  if (behavType === "talk") {
    return {
      conditions: [
        { operator: "is", type: "char_facing_char", args: ["player", npcSlug] },
        { operator: "is", type: "button_pressed", args: ["INTERACT"] },
      ],
      actions: [{ type: "char_face", args: [npcSlug, "player"] }, ...existingActions],
    };
  }

  // Unknown behavior — return as-is
  return { conditions: [], actions: existingActions };
}

export function loadEventsFromYaml(yamlText: string): EventDef[] {
  const data = parse(yamlText) as YamlFile;
  const events: EventDef[] = [];
  let nextId = 1;

  for (const [name, entry] of Object.entries(data.events)) {
    const actions = (entry.actions ?? []).map(parseActionString);

    const explicitConditions = (entry.conditions ?? []).map(parseConditionString);
    let finalActions: ActionDef[] = actions;
    // Upstream supports `behav` as either a string or a list of behavior
    // entries (e.g. `[talk spyder_dante]`). Normalize and expand each entry —
    // multiple entries simply layer their conditions/actions in sequence.
    const behavList = entry.behav ? (Array.isArray(entry.behav) ? entry.behav : [entry.behav]) : [];
    const expandedConditions: ConditionDef[] = [];
    for (const b of behavList) {
      const expanded = expandBehavior(b, finalActions);
      expandedConditions.push(...expanded.conditions);
      finalActions = expanded.actions;
    }
    const conditions: ConditionDef[] = [...expandedConditions, ...explicitConditions];
    events.push({
      id: nextId++,
      name,
      x: entry.x,
      y: entry.y,
      width: entry.width,
      height: entry.height,
      conditions,
      actions: finalActions,
    });
  }

  return events;
}
