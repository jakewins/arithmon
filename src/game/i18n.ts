/**
 * Lightweight i18n module — parses a GNU gettext PO file into a lookup map
 * and provides a `t(key)` function for resolving display labels.
 */

const translations = new Map<string, string>();

/** Parse a PO file's text content into the translations map. */
export function loadPO(text: string): void {
  translations.clear();
  const lines = text.split("\n");
  let currentId: string | null = null;
  let currentStr: string | null = null;

  /** Unescape PO string escapes (\n, \t, \\, \"). */
  const unescape = (s: string) =>
    s.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\\\/g, "\\").replace(/\\"/g, '"');

  const flush = () => {
    if (currentId !== null && currentStr !== null && currentId !== "" && currentStr !== "") {
      translations.set(currentId, unescape(currentStr));
    }
  };

  for (const line of lines) {
    const idMatch = line.match(/^msgid\s+"(.*)"/);
    if (idMatch) {
      flush();
      currentId = idMatch[1];
      currentStr = null;
      continue;
    }
    const strMatch = line.match(/^msgstr\s+"(.*)"/);
    if (strMatch) {
      currentStr = strMatch[1];
      continue;
    }
    // Continuation line: bare "quoted string"
    const contMatch = line.match(/^"(.*)"/);
    if (contMatch && currentStr !== null) {
      currentStr += contMatch[1];
    }
  }
  flush();
}

/** Title-case fallback for unknown keys: "spyder_campaign" → "Spyder Campaign". */
function titleCase(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Look up a translated string by key, falling back to title-cased key. */
export function t(key: string): string {
  return translations.get(key) ?? titleCase(key);
}
