import type { EventAction, EventContext } from "../types";
import { registerAction } from "../registry";
import { loadEventsFromYaml } from "../loader";

/** Tracks which YAML files have already been loaded to prevent duplicates. */
const loadedYamls = new Set<string>();

class LoadYamlAction implements EventAction {
  type = "load_yaml";
  done = false;

  private filename: string;

  constructor(args: string[]) {
    this.filename = args[0];
  }

  start(ctx: EventContext): void {
    if (loadedYamls.has(this.filename)) {
      this.done = true;
      return;
    }

    const cacheKey = `events-${this.filename}`;
    const yamlText = ctx.scene.cache.text.get(cacheKey) as string | undefined;
    if (!yamlText) {
      console.warn(`load_yaml: "${this.filename}" not found in cache (key: ${cacheKey})`);
      this.done = true;
      return;
    }

    const events = loadEventsFromYaml(yamlText);
    if (ctx.addEvents) {
      ctx.addEvents(events);
    }

    loadedYamls.add(this.filename);
    this.done = true;
  }

  update(): void {}
  cleanup(): void {}
}

registerAction("load_yaml", (args) => new LoadYamlAction(args));
