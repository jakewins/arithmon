/** Default wild encounter probability per grass-tile step (0–1). */
let encounterRate = 0.1;

export function getEncounterRate(): number {
  return encounterRate;
}

/** Override the wild encounter probability (0 = disabled, 1 = every step). */
export function setEncounterRate(rate: number): void {
  encounterRate = Math.max(0, Math.min(1, rate));
}
