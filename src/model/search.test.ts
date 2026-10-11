import { describe, expect, it } from "vitest";
import { isDimmed, matchVisible, nameMatches, normaliseQuery, type MatchableCard } from "./search";

const card = (id: string, parentId: string | null, name: string | null): MatchableCard => ({
  id,
  parentId,
  node: name === null ? null : { name },
});

// Vault > Projects > Plugin > Roadmap.md, Projects > notes.md, Vault > Daily > today.md, and a pill.
const visible: MatchableCard[] = [
  card("root", null, "Vault"),
  card("projects", "root", "Projects"),
  card("plugin", "projects", "Plugin"),
  card("roadmap", "plugin", "Roadmap.md"),
  card("notes", "projects", "notes.md"),
  card("daily", "root", "Daily"),
  card("today", "daily", "today.md"),
  card("more:daily", "daily", null),
];

describe("normaliseQuery", () => {
  it("trims and lower-cases", () => {
    expect(normaliseQuery("  RoadMap ")).toBe("roadmap");
  });
});

describe("nameMatches", () => {
  it("ignores case and stray spaces, and matches part of a name", () => {
    expect(nameMatches("Roadmap.md", " ROAD ")).toBe(true);
    expect(nameMatches("Roadmap.md", "map.m")).toBe(true);
  });
  it("matches nothing for an empty query or a different name", () => {
    expect(nameMatches("Roadmap.md", "")).toBe(false);
    expect(nameMatches("Roadmap.md", "   ")).toBe(false);
    expect(nameMatches("Roadmap.md", "zzz")).toBe(false);
  });
});

describe("matchVisible", () => {
  it("is null for an empty or blank query", () => {
    expect(matchVisible(visible, "")).toBeNull();
    expect(matchVisible(visible, "  ")).toBeNull();
  });

  it("finds matching cards by name, ignoring case, with the cards above them", () => {
    const result = matchVisible(visible, "ROAD");
    expect([...(result?.hits ?? [])]).toEqual(["roadmap"]);
    expect(result?.ancestors).toEqual(new Set(["plugin", "projects", "root"]));
  });

  it("matches folders as well as files", () => {
    expect(matchVisible(visible, "plug")?.hits.has("plugin")).toBe(true);
  });

  it("returns empty sets when nothing on screen matches", () => {
    const result = matchVisible(visible, "zzz");
    expect(result?.hits.size).toBe(0);
    expect(result?.ancestors.size).toBe(0);
  });

  it("only looks at what is on screen, and never matches a pill", () => {
    expect(matchVisible(visible, "more")?.hits.size).toBe(0);
    expect(matchVisible(visible.filter((c) => c.id !== "roadmap"), "road")?.hits.size).toBe(0);
  });

  it("copes with a card whose parent is not on screen", () => {
    const result = matchVisible([card("lone", "gone", "alone")], "lone");
    expect([...(result?.hits ?? [])]).toEqual(["lone"]);
    expect(result?.ancestors.has("gone")).toBe(true);
  });
});

describe("isDimmed", () => {
  const result = matchVisible(visible, "road");
  it("dims nothing when nothing is typed", () => {
    expect(isDimmed("notes", null)).toBe(false);
  });
  it("keeps matches and the cards leading to them, and dims the rest", () => {
    expect(isDimmed("roadmap", result)).toBe(false);
    expect(isDimmed("plugin", result)).toBe(false);
    expect(isDimmed("root", result)).toBe(false);
    expect(isDimmed("notes", result)).toBe(true);
    expect(isDimmed("more:daily", result)).toBe(true);
  });
});
