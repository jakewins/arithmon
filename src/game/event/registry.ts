import type { ConditionFactory, ActionFactory } from "./types";

const conditionRegistry = new Map<string, ConditionFactory>();
const actionRegistry = new Map<string, ActionFactory>();

export function registerCondition(type: string, factory: ConditionFactory): void {
  conditionRegistry.set(type, factory);
}

export function registerAction(type: string, factory: ActionFactory): void {
  actionRegistry.set(type, factory);
}

export function createCondition(type: string, args: string[]) {
  const factory = conditionRegistry.get(type);
  if (!factory) throw new Error(`Unknown condition type: ${type}`);
  return factory(args);
}

export function createAction(type: string, args: string[]) {
  const factory = actionRegistry.get(type);
  if (!factory) throw new Error(`Unknown action type: ${type}`);
  return factory(args);
}
