import { parse } from "yaml";
import type { EventDef, ConditionDef, ActionDef } from "./types";

const TILE_SIZE = 16;

interface YamlEvent {
  conditions?: string[];
  actions?: string[];
  behav?: string;
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

    let conditions: ConditionDef[];
    if (entry.behav) {
      const expanded = expandBehavior(entry.behav, actions);
      conditions = expanded.conditions;
      events.push({
        id: nextId++,
        name,
        x: entry.x !== undefined ? Math.floor(entry.x / TILE_SIZE) : undefined,
        y: entry.y !== undefined ? Math.floor(entry.y / TILE_SIZE) : undefined,
        width: entry.width !== undefined ? Math.floor(entry.width / TILE_SIZE) : undefined,
        height: entry.height !== undefined ? Math.floor(entry.height / TILE_SIZE) : undefined,
        conditions,
        actions: expanded.actions,
      });
    } else {
      conditions = (entry.conditions ?? []).map(parseConditionString);
      events.push({
        id: nextId++,
        name,
        x: entry.x !== undefined ? Math.floor(entry.x / TILE_SIZE) : undefined,
        y: entry.y !== undefined ? Math.floor(entry.y / TILE_SIZE) : undefined,
        width: entry.width !== undefined ? Math.floor(entry.width / TILE_SIZE) : undefined,
        height: entry.height !== undefined ? Math.floor(entry.height / TILE_SIZE) : undefined,
        conditions,
        actions,
      });
    }
  }

  return events;
}
