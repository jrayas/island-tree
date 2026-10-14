/**
 * The settings page as data, for Obsidian's declarative settings API (1.13 and later).
 *
 * Obsidian searches the name, description and aliases of every definition, so each setting is
 * listed here even though its control is still drawn by `configureField` (controls.ts) inside a
 * `render` callback. Each tab of the old tab strip is a page, and each section of a tab is a group.
 * Pure data and callbacks, so it can be tested without Obsidian.
 */
import type {
  Setting,
  SettingDefinition,
  SettingDefinitionGroup,
  SettingDefinitionItem,
  SettingDefinitionPage,
  SettingPage,
} from "obsidian";
import { FIELDS, TABS, type Field, type TabId } from "./schema";

export interface DefinitionDeps {
  /**
   * Draws the live preview (and, on the first page, the header card) into a row. Returns a clean-up
   * that stops the preview redrawing.
   */
  renderIntro: (setting: Setting, withHeader: boolean) => (() => void) | void;
  /** Fills one setting's row with its control. */
  renderField: (setting: Setting, field: Field) => void;
  /** The Presets page, which is made of actions rather than settings. */
  presetsPage: () => SettingPage;
}

/** The sections of a tab, in order, without repeats. */
export function sectionsOf(tab: TabId): string[] {
  const sections: string[] = [];
  for (const field of FIELDS) {
    if (field.tab === tab && !sections.includes(field.section)) sections.push(field.section);
  }
  return sections;
}

function fieldDefinition(field: Field, tabLabel: string, deps: DefinitionDeps): SettingDefinition {
  return {
    name: field.label,
    desc: field.description,
    aliases: [field.section, tabLabel],
    render: (setting) => deps.renderField(setting, field),
  };
}

function introDefinition(withHeader: boolean, deps: DefinitionDeps): SettingDefinition {
  return {
    name: "Island tree",
    // The header and preview are not settings, so they stay out of the search results.
    searchable: false,
    render: (setting) => deps.renderIntro(setting, withHeader),
  };
}

function fieldPage(tab: { id: TabId; label: string }, deps: DefinitionDeps): SettingDefinitionPage {
  const groups: SettingDefinitionGroup[] = sectionsOf(tab.id).map((section) => ({
    type: "group",
    heading: section,
    items: FIELDS.filter((field) => field.tab === tab.id && field.section === section).map((field) =>
      fieldDefinition(field, tab.label, deps),
    ),
  }));
  return {
    type: "page",
    name: tab.label,
    desc: sectionsOf(tab.id).join(", "),
    items: [introDefinition(false, deps), ...groups],
  };
}

/** Everything the settings page shows: the header and preview, then one page per tab. */
export function buildDefinitions(deps: DefinitionDeps): SettingDefinitionItem[] {
  const pages = TABS.map((tab): SettingDefinitionPage => {
    if (tab.id === "presets") {
      return {
        type: "page",
        name: tab.label,
        desc: "Built-in and saved looks, resets, and exporting or importing settings.",
        page: () => deps.presetsPage(),
      };
    }
    return fieldPage(tab, deps);
  });
  return [introDefinition(true, deps), ...pages];
}
