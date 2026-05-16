# STORY-0017: i18n — Load Tuxemon Translations for English Labels

## Description

Our `translated_dialog_choice` action currently title-cases raw keys (e.g. `spyder_campaign` → "Spyder Campaign"). Tuxemon ships proper English labels in a GNU gettext `.po` file that maps these keys to human-friendly strings like "Tuxemon: Spyder and the Cathedral", "Male", "Female", "Nonbinary", etc. We should load that file and use it for display labels.

### Upstream Translation File

- **Path:** `mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po`
- **Format:** GNU gettext PO (plain text, ~19k lines, ~6k translation keys)
- **Raw URL:** `https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po`

Sample entries relevant to start_tuxemon.yaml:

```
msgid "spyder_campaign"
msgstr "Tuxemon: Spyder and the Cathedral"

msgid "xero_campaign"
msgstr "Tuxemon: Xero"

msgid "water_campaign"
msgstr "Tuxemon: Waves of Chaos"

msgid "gender_male"
msgstr "Male"

msgid "gender_female"
msgstr "Female"

msgid "gender_enby"
msgstr "Nonbinary"

msgid "gender_whatever"
msgstr "Whatever"

msgid "black_male"
msgstr "Black male"

msgid "white_male"
msgstr "White male"

msgid "black_female"
msgstr "Black female"

msgid "white_female"
msgstr "White female"
```

The PO format also supports `${{variable}}` substitution (e.g. `"Hey, ${{name}}!"`) used in NPC dialog.

### Approach: Simple Custom PO Loader

Rather than pulling in a full gettext library, we can write a lightweight PO parser (~40 lines) that extracts `msgid`/`msgstr` pairs into a `Map<string, string>`. Reasons:

- We only need simple key→string lookup (no plurals, no contexts, no compiled `.mo` files).
- The PO format for simple entries is trivial: alternating `msgid "..."` / `msgstr "..."` lines.
- Zero external dependencies — keeps the bundle small for a browser game.
- Variable substitution (`${{name}}`) can be a one-liner regex replace added later when NPC dialog needs it.

The loader would:
1. Parse the `.po` file text into a `Map<string, string>`.
2. Export a `t(key)` function that returns the translated string or falls back to title-casing the key.
3. Be used by `translatedDialogChoice` (and eventually `dialog`) to resolve display text.

### What to build

1. **Fetch `base.po`** from upstream into `public/assets/l10n/en_US.po`.
2. **Write `src/game/i18n.ts`** — a simple PO parser + `t(key)` lookup function.
3. **Preload the PO file** in OverworldScene as a text asset.
4. **Initialize the i18n module** after preload (parse the PO text, populate the map).
5. **Use `t(key)`** in `translatedDialogChoice` instead of `titleCase()`.
6. **Unit test** the PO parser with a small inline PO snippet.

### Future extensions (not in this story)

- Multi-language support (load `fr_FR.po`, `es_ES.po`, etc.)
- `${{variable}}` interpolation for NPC dialog lines
- Compiled `.mo` binary format for faster loading (only matters at scale)

## Acceptance Criteria

- [ ] `base.po` fetched from upstream and stored in `public/assets/l10n/en_US.po`
- [ ] PO parser correctly extracts msgid/msgstr pairs
- [ ] `t(key)` returns English label for known keys, falls back to title-case for unknown
- [ ] `translated_dialog_choice` uses `t()` for display labels
- [ ] Choice labels in start_tuxemon read "Male" / "Female" / "Nonbinary" (not "Gender Male" etc.)
- [ ] Unit test covers parser + fallback behavior
- [ ] All existing tests pass

## Proposed TODO Breakdown

1. Fetch `base.po` from upstream into `public/assets/l10n/en_US.po`
2. Write PO parser + `t()` in `src/game/i18n.ts`
3. Unit test the parser
4. Preload PO file in OverworldScene and initialize i18n
5. Wire `t()` into `translatedDialogChoice` (replace `titleCase`)
6. Manual browser test — verify labels in start_tuxemon cutscene
