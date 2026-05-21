/**
 * Tuxemon-style `${{...}}` placeholder substitution for translated dialog.
 *
 * Mirrors `upstream/tuxemon/ui/text_formatter.py`: build a `placeholder ->
 * value()` map keyed off current session state, then do a single
 * substring-replace pass over the input text. Every user-visible string that
 * comes from the .po (and any free-form `dialog` text) should flow through
 * `formatText` so player name, money, monster names, etc. land in the UI.
 *
 * Pure function over `session` state — no Phaser/UI imports — so it can be
 * unit-tested without booting the engine.
 */

import { session } from "./session";
import { t } from "./i18n";

/**
 * One-shot warning per unknown placeholder so repeated dialogs don't spam the
 * console. Cleared by `resetTextFormatterWarnings()` in tests.
 */
const warnedPlaceholders = new Set<string>();

/** Reset the unknown-placeholder warning set. Test-only. */
export function resetTextFormatterWarnings(): void {
  warnedPlaceholders.clear();
}

/** Pattern that matches a single `${{...}}` placeholder. */
const PLACEHOLDER_RE = /\$\{\{([^}]+)\}\}/g;

/**
 * Format `${{money}}` and `${{money_formatted}}`. Tuxemon uses the system
 * locale's currency formatter; we keep it simple — a thousands-separated
 * integer prefixed with `$`. Cents are never used in the upstream data.
 */
function formatMoney(amount: number): string {
  return `$${Math.trunc(amount).toLocaleString("en-US")}`;
}

/**
 * Resolve a placeholder body (the text between `${{` and `}}`) to its current
 * string value, or `null` if the placeholder is unknown / has no backing
 * field. Callers handle the null case by warning and leaving the original
 * text intact.
 */
function resolve(body: string): string | null {
  const player = session.player;
  const meta = session.mapMeta;

  // Direct identity lookups first — these are the bulk of placeholders.
  switch (body) {
    case "name":
      return player.name;
    case "NAME":
      return player.name.toUpperCase();
    case "currency":
      return "$";
    case "money":
      return String(Math.trunc(player.money));
    case "money_formatted":
      return formatMoney(player.money);
    case "map_name":
      // Upstream uses the TMX `slug` property (e.g. "route2", "paper_town"),
      // not the prefixed registry key. Fall back to mapKey so legacy callers
      // that haven't set mapMeta yet still get a (less polished) string.
      return t(meta?.slug || session.mapKey);
    case "map_desc":
      return t(`${meta?.slug || session.mapKey}_description`);
    case "today":
      // Tuxemon serialises the in-game date; we don't yet model one. Emit
      // today's calendar date so the string isn't blank — good enough for the
      // few flavour lines that use it.
      return new Date().toLocaleDateString("en-US");
  }

  // Cardinal directions — translated from the slug stored on the active map's
  // TMX `<property name="north"/>` etc. Empty slug (no neighbour declared)
  // renders as upstream's "-" sentinel; this matches `MapConfig` in
  // `upstream/tuxemon/map/tuxemon.py`.
  if (body === "north" || body === "south" || body === "east" || body === "west") {
    const slug = meta ? meta[body] : "";
    if (!slug) return "-";
    // Upstream supports comma-separated slugs (`north: town_a,town_b`) joined
    // by " - "; mirror that here for parity with any future multi-edge maps.
    return slug
      .split(",")
      .map((s) => t(s.trim()))
      .join(" - ");
  }

  // ${{var:<key>}} — game variable lookup. Missing keys fall through to the
  // unknown branch so the caller sees a single warning.
  const varMatch = /^var:(.+)$/.exec(body);
  if (varMatch) {
    const value = player.gameVariables.get(varMatch[1]);
    return value ?? null;
  }

  // ${{msgid:<key>}} — game variable holding a translation key. Upstream uses
  // this for "the slug stored in this var should be displayed as its name".
  const msgidMatch = /^msgid:(.+)$/.exec(body);
  if (msgidMatch) {
    const value = player.gameVariables.get(msgidMatch[1]);
    return value !== undefined ? t(value) : null;
  }

  // ${{monster_<N>_<attr>}} — Nth party monster's attribute. Only the
  // attributes we actually render are wired up; everything else falls through
  // to the unknown branch.
  const monsterMatch = /^monster_(\d+)_(.+)$/.exec(body);
  if (monsterMatch) {
    const index = Number(monsterMatch[1]);
    const attr = monsterMatch[2];
    const monster = player.monsters[index];
    if (!monster) return null;
    switch (attr) {
      case "name":
        return monster.name;
      case "level":
        return String(monster.level);
      case "hp":
        return String(monster.currentHp);
      case "hp_max":
        return String(monster.maxHp);
      default:
        return null;
    }
  }

  return null;
}

/**
 * Replace every `${{...}}` placeholder in `text` with its current value.
 * Unknown placeholders are left in place and warned once per process.
 */
export function formatText(text: string): string {
  return text.replace(PLACEHOLDER_RE, (match, body: string) => {
    const value = resolve(body);
    if (value !== null) return value;
    if (!warnedPlaceholders.has(match)) {
      warnedPlaceholders.add(match);
      // TODO: backfill once we model map metadata / in-game date / etc.
      console.warn(`[textFormatter] unhandled placeholder: ${match}`);
    }
    return match;
  });
}
