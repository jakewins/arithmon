import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { formatText, resetTextFormatterWarnings } from "../game/textFormatter";
import { resetSession, session } from "../game/session";
import { Monster } from "../game/model/Monster";
import { loadPO } from "../game/i18n";

/**
 * Tuxemon-style placeholder substitution. Tests focus on the contract the
 * dialog actions rely on: known placeholders resolve to current session
 * state, unknown ones leave the literal `${{...}}` text in place and emit a
 * one-shot console warning.
 */
describe("formatText", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetSession();
    resetTextFormatterWarnings();
    session.player.name = "Test";
    session.player.money = 1234;
    session.mapKey = "paper_town";

    // Minimum .po so map_name / msgid lookups have something to resolve.
    loadPO(`
msgid "paper_town"
msgstr "Paper"

msgid "paper_town_description"
msgstr "A quiet papery town."

msgid "spyder_billie"
msgstr "Billie"
`);

    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("passes through plain text unchanged", () => {
    expect(formatText("Hello, world.")).toBe("Hello, world.");
    expect(formatText("")).toBe("");
  });

  it("substitutes ${{name}} and ${{NAME}} preserving case", () => {
    session.player.name = "Luna";
    expect(formatText("How are you, ${{name}}?")).toBe("How are you, Luna?");
    expect(formatText("HELLO ${{NAME}}!")).toBe("HELLO LUNA!");
  });

  it("resolves multiple placeholders in one string", () => {
    expect(formatText("${{name}}'s wallet: ${{money_formatted}}")).toBe("Test's wallet: $1,234");
  });

  it.each([
    { input: "${{currency}}", expected: "$" },
    { input: "${{money}}", expected: "1234" },
    { input: "${{money_formatted}}", expected: "$1,234" },
    { input: "${{map_name}}", expected: "Paper" },
    { input: "${{map_desc}}", expected: "A quiet papery town." },
  ])("substitutes $input -> $expected", ({ input, expected }) => {
    expect(formatText(input)).toBe(expected);
  });

  it("substitutes ${{var:<key>}} from gameVariables", () => {
    session.player.gameVariables.set("brad_points", "7");
    expect(formatText("Brad has ${{var:brad_points}} points.")).toBe("Brad has 7 points.");
  });

  it("leaves missing ${{var:<key>}} in place and warns once", () => {
    expect(formatText("nothing here: ${{var:nope}}")).toBe("nothing here: ${{var:nope}}");
    expect(formatText("again: ${{var:nope}}")).toBe("again: ${{var:nope}}");
    // Same placeholder warned only once across the whole process.
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("substitutes ${{msgid:<key>}} through the translation table", () => {
    session.player.gameVariables.set("loser", "spyder_billie");
    expect(formatText("You beat ${{msgid:loser}}!")).toBe("You beat Billie!");
  });

  it("substitutes ${{monster_0_name}} and ${{monster_0_level}}", () => {
    const mon = Monster.spawn("budaye", 7);
    session.player.monsters.push(mon);
    expect(formatText("Send ${{monster_0_name}} (Lv${{monster_0_level}})!")).toBe(
      `Send ${mon.name} (Lv7)!`,
    );
  });

  it("leaves monster placeholder in place when index is out of range", () => {
    expect(formatText("ghost: ${{monster_0_name}}")).toBe("ghost: ${{monster_0_name}}");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("leaves entirely-unknown placeholders in place and warns", () => {
    expect(formatText("hi ${{nonsense}}!")).toBe("hi ${{nonsense}}!");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Map signs use `${{map_name}}` + cardinal placeholders. Upstream resolves
   * these from the active TMX's `<properties>` (`slug`, `north`, ...) rather
   * than the registry key; OverworldScene caches them on `session.mapMeta`.
   * These tests pin the substitution behaviour the route2 / paper_town signs
   * depend on.
   */
  describe("with mapMeta populated", () => {
    beforeEach(() => {
      session.mapMeta = {
        slug: "route2",
        north: "citypark",
        south: "brideswood",
        east: "",
        west: "cotton_town",
      };
      loadPO(`
msgid "route2"
msgstr "Route 2"

msgid "route2_description"
msgstr "The historic path!"

msgid "citypark"
msgstr "City Park"

msgid "brideswood"
msgstr "Brideswood"

msgid "cotton_town"
msgstr "Cotton"
`);
    });

    it("renders ${{map_name}} from the slug, not the mapKey", () => {
      session.mapKey = "spyder_route2";
      expect(formatText("${{map_name}}")).toBe("Route 2");
      expect(formatText("${{map_desc}}")).toBe("The historic path!");
    });

    it("translates cardinal neighbours and renders missing edges as '-'", () => {
      expect(formatText("N: ${{north}} / S: ${{south}} / E: ${{east}} / W: ${{west}}")).toBe(
        "N: City Park / S: Brideswood / E: - / W: Cotton",
      );
    });

    it("joins comma-separated neighbour slugs with ' - '", () => {
      session.mapMeta!.north = "citypark,brideswood";
      expect(formatText("${{north}}")).toBe("City Park - Brideswood");
    });
  });
});
