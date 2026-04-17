import { describe, it, expect, beforeEach } from "vitest";
import { loadPO, t } from "../game/i18n";

const SAMPLE_PO = `
# Sample PO file
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "gender_male"
msgstr "Male"

msgid "gender_female"
msgstr "Female"

msgid "gender_enby"
msgstr "Nonbinary"

msgid "spyder_campaign"
msgstr "Tuxemon: Spyder and the Cathedral"

msgid "empty_value"
msgstr ""
`;

describe("i18n PO parser", () => {
  beforeEach(() => {
    loadPO(SAMPLE_PO);
  });

  it("parses msgid/msgstr pairs", () => {
    expect(t("gender_male")).toBe("Male");
    expect(t("gender_female")).toBe("Female");
    expect(t("gender_enby")).toBe("Nonbinary");
    expect(t("spyder_campaign")).toBe("Tuxemon: Spyder and the Cathedral");
  });

  it("skips entries with empty msgstr", () => {
    // empty_value has msgstr "" so it should fall back to title-case
    expect(t("empty_value")).toBe("Empty Value");
  });

  it("falls back to title-case for unknown keys", () => {
    expect(t("some_unknown_key")).toBe("Some Unknown Key");
  });

  it("parses multi-line msgstr values", () => {
    loadPO(`
msgid "intro"
msgstr ""
"Hello, I am the CEO.\\n"
"It is my duty to inform you."

msgid "simple"
msgstr "one liner"
`);
    expect(t("intro")).toBe("Hello, I am the CEO.\nIt is my duty to inform you.");
    expect(t("simple")).toBe("one liner");
  });

  it("clears previous translations on reload", () => {
    expect(t("gender_male")).toBe("Male");
    loadPO('msgid "new_key"\nmsgstr "New Value"\n');
    expect(t("new_key")).toBe("New Value");
    // Previous key should now fall back
    expect(t("gender_male")).toBe("Gender Male");
  });
});
