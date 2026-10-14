import { describe, expect, it, vi } from "vitest";
import type {
  Setting,
  SettingDefinition,
  SettingDefinitionGroup,
  SettingDefinitionItem,
  SettingDefinitionPage,
  SettingPage,
} from "obsidian";
import { buildDefinitions, sectionsOf, type DefinitionDeps } from "./definitions";
import { FIELDS, TABS, fieldId } from "./schema";

const deps = (): DefinitionDeps => ({
  renderIntro: vi.fn(),
  renderField: vi.fn(),
  presetsPage: () => ({}) as SettingPage,
});

const isPage = (item: SettingDefinitionItem): item is SettingDefinitionPage => "type" in item && item.type === "page";
const isGroup = (item: SettingDefinitionItem): item is SettingDefinitionGroup =>
  "type" in item && (item.type === "group" || item.type === "list");

const pages = (items: SettingDefinitionItem[]): SettingDefinitionPage[] => items.filter(isPage);

/** Every setting definition on a field page, with the page and section it sits under. */
function listed(items: SettingDefinitionItem[]): { tab: string; section: string; def: SettingDefinition }[] {
  const out: { tab: string; section: string; def: SettingDefinition }[] = [];
  for (const page of pages(items)) {
    for (const item of page.items ?? []) {
      if (!isGroup(item)) continue;
      for (const child of item.items ?? []) {
        if ("type" in child) continue;
        out.push({ tab: page.name, section: item.heading ?? "", def: child });
      }
    }
  }
  return out;
}

describe("buildDefinitions", () => {
  const items = buildDefinitions(deps());

  it("starts with the header and preview, kept out of the search", () => {
    const first = items[0] as SettingDefinition;
    expect(first.name).toBe("Island tree");
    expect(first.searchable).toBe(false);
    expect(typeof first.render).toBe("function");
  });

  it("has one page for each tab, in order", () => {
    expect(pages(items).map((page) => page.name)).toEqual(TABS.map((tab) => tab.label));
  });

  it("lists every setting exactly once", () => {
    const names = listed(items).map(({ def }) => def.name);
    expect(names).toHaveLength(FIELDS.length);
    expect(new Set(names).size).toBe(names.length);
    for (const field of FIELDS) expect(names).toContain(field.label);
  });

  it("puts each setting on the page of its tab, under the heading of its section", () => {
    const where = new Map(listed(items).map(({ tab, section, def }) => [def.name, { tab, section }]));
    for (const field of FIELDS) {
      const label = TABS.find((tab) => tab.id === field.tab)?.label;
      expect(where.get(field.label), fieldId(field)).toEqual({ tab: label, section: field.section });
    }
  });

  it("gives every setting a name, a description and search terms", () => {
    for (const { def, tab, section } of listed(items)) {
      expect(def.name.length).toBeGreaterThan(0);
      expect(typeof def.desc === "string" ? def.desc.length : 0).toBeGreaterThan(0);
      expect(def.aliases).toEqual([section, tab]);
    }
  });

  it("draws every setting with a render callback, never a control", () => {
    for (const { def } of listed(items)) {
      expect(typeof def.render).toBe("function");
      expect(def.control).toBeUndefined();
    }
  });

  it("opens each page of settings with the preview, without the header", () => {
    const calls: boolean[] = [];
    const spy = deps();
    spy.renderIntro = (_setting, withHeader) => void calls.push(withHeader);
    const built = buildDefinitions(spy);
    for (const page of pages(built).filter((p) => p.items)) {
      const first = page.items?.[0] as SettingDefinition;
      expect(first.searchable).toBe(false);
      first.render?.({} as Setting, {} as never);
    }
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((withHeader) => withHeader === false)).toBe(true);
    (built[0] as SettingDefinition).render?.({} as Setting, {} as never);
    expect(calls[calls.length - 1]).toBe(true);
  });

  it("hands each setting to renderField when its row is drawn", () => {
    const spy = deps();
    const built = buildDefinitions(spy);
    const first = listed(built)[0];
    first?.def.render?.({} as Setting, {} as never);
    expect(spy.renderField).toHaveBeenCalledTimes(1);
    expect((spy.renderField as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]).toBe(FIELDS[0]);
  });

  it("makes the Presets page from a factory, not a list of settings", () => {
    const presets = pages(items).find((page) => page.name === "Presets");
    expect(presets?.items).toBeUndefined();
    expect(typeof presets?.page).toBe("function");
  });
});

describe("sectionsOf", () => {
  it("lists a tab's sections in order, once each", () => {
    for (const tab of TABS.filter((t) => t.id !== "presets")) {
      const sections = sectionsOf(tab.id);
      expect(sections.length).toBeGreaterThan(0);
      expect(new Set(sections).size).toBe(sections.length);
    }
    expect(sectionsOf("presets")).toEqual([]);
  });
});
