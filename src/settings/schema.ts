/**
 * The single description of every setting: its group, tab, type, range and default.
 *
 * Validation, the controls on the settings page, presets, "reset to default" and
 * import and export are all driven from this table, so adding a setting means
 * adding one entry here (SPEC.md section 9). The typed interfaces below give the
 * rest of the plugin a normal, checked shape to read.
 */
import type { CurveStyle, LayoutMode, MindMapView } from "../layout/types";

export type { CurveStyle };

/** Bumped when the saved shape changes; `migrate` in validate.ts upgrades older data. */
export const SETTINGS_VERSION = 2;

export type DashStyle = "solid" | "dashed" | "dotted";
export type GridType = "dots" | "lines" | "none";
export type DeleteBehaviour = "ask" | "immediate";

export interface CardSettings {
  width: number;
  height: number;
  radius: number;
  borderWidth: number;
  paddingX: number;
  /** Pixels, or 0 to follow the Obsidian interface text size. */
  fontSize: number;
  startDetailed: boolean;
  showAge: boolean;
  showSize: boolean;
  showLinks: boolean;
  showTags: boolean;
  showStatus: boolean;
  /** The note property whose value shows as a status chip. */
  statusProperty: string;
}

export interface LineSettings {
  curve: CurveStyle;
  thickness: number;
  dash: DashStyle;
  /** 0 turns the animation off; 1 is the default speed. */
  flowSpeed: number;
  /** A hex colour, or an empty string to follow the theme accent. */
  highlightColour: string;
}

export interface CanvasSettings {
  grid: GridType;
  gridSize: number;
  gridSpacing: number;
  /** Percent. */
  gridOpacity: number;
  /** A hex colour, or an empty string to follow the theme. */
  gridColour: string;
}

/** How tightly the dashboard is drawn. Compact is an overlay: it never changes the saved sizes. */
export type Density = "comfortable" | "compact";

export interface LayoutSettings {
  defaultLayout: LayoutMode;
  /** Which mind map view to draw. The toolbar's Mind map button changes it, so it is remembered. */
  mindMapView: MindMapView;
  /** The toolbar's Compact button switches it, so it is remembered. */
  density: Density;
  gap: number;
  levelGap: number;
  ringRadius: number;
  ringStep: number;
  overflowLimit: number;
  startExpandFolders: boolean;
  startExpandFiles: boolean;
}

export interface EditingSettings {
  startLocked: boolean;
  /** Minutes without an edit before the dashboard locks again; 0 means never. */
  autoRelockMinutes: number;
  allowDrag: boolean;
  /** Folders holding more files than this need an extra confirmation. */
  confirmThreshold: number;
  deleteBehaviour: DeleteBehaviour;
}

export type SettingValue = string | number | boolean;

/** A named look, stored by field id (for example "cards.width"). */
export interface SavedPreset {
  name: string;
  values: Record<string, SettingValue>;
}

export interface IslandTreeSettings {
  version: number;
  cards: CardSettings;
  lines: LineSettings;
  canvas: CanvasSettings;
  layout: LayoutSettings;
  editing: EditingSettings;
  presets: SavedPreset[];
}

export type GroupKey = "cards" | "lines" | "canvas" | "layout" | "editing";
export type TabId = "cards" | "lines" | "layout" | "editing" | "presets";

export interface NumberDef {
  kind: "number";
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  /** What a value of 0 means, shown in the description (for example "the theme size"). */
  zeroMeans?: string;
}
export interface EnumDef {
  kind: "enum";
  options: readonly { value: string; label: string }[];
  default: string;
}
export interface BooleanDef {
  kind: "boolean";
  default: boolean;
}
export interface ColourDef {
  kind: "colour";
  /** Always the empty string, meaning "follow the theme". */
  default: "";
}
export interface TextDef {
  kind: "text";
  default: string;
  maxLength: number;
}
export type FieldDef = NumberDef | EnumDef | BooleanDef | ColourDef | TextDef;

export interface Field {
  group: GroupKey;
  key: string;
  tab: TabId;
  /** A heading inside the tab. */
  section: string;
  label: string;
  description: string;
  /** Whether a preset stores this setting. Behaviour settings are not part of a look. */
  inPreset: boolean;
  def: FieldDef;
}

const number = (def: Omit<NumberDef, "kind">): NumberDef => ({ kind: "number", ...def });
const bool = (value: boolean): BooleanDef => ({ kind: "boolean", default: value });

export const FIELDS: readonly Field[] = [
  // Cards
  {
    group: "cards", key: "width", tab: "cards", section: "Size and shape", inPreset: true,
    label: "Card width",
    description: "Width of a card in the vertical layout. The other card sizes follow from it.",
    def: number({ min: 80, max: 260, step: 2, default: 116, unit: "px" }),
  },
  {
    group: "cards", key: "height", tab: "cards", section: "Size and shape", inPreset: true,
    label: "Card height",
    description: "Height of a card in the vertical layout.",
    def: number({ min: 28, max: 100, step: 2, default: 40, unit: "px" }),
  },
  {
    group: "cards", key: "radius", tab: "cards", section: "Size and shape", inPreset: true,
    label: "Corner radius",
    description: "0 gives square corners. Half the card height or more gives a pill.",
    def: number({ min: 0, max: 50, step: 1, default: 20, unit: "px" }),
  },
  {
    group: "cards", key: "borderWidth", tab: "cards", section: "Size and shape", inPreset: true,
    label: "Border width",
    description: "Thickness of the line around a card.",
    def: number({ min: 0, max: 4, step: 0.5, default: 1, unit: "px" }),
  },
  {
    group: "cards", key: "paddingX", tab: "cards", section: "Size and shape", inPreset: true,
    label: "Side padding",
    description: "Space between a card's edge and its text.",
    def: number({ min: 4, max: 24, step: 1, default: 12, unit: "px" }),
  },
  {
    group: "cards", key: "fontSize", tab: "cards", section: "Size and shape", inPreset: true,
    label: "Text size",
    description: "Size of the text on cards, in pixels. 0 follows the Obsidian interface size.",
    def: number({ min: 0, max: 20, step: 1, default: 0, unit: "px", zeroMeans: "the theme size" }),
  },
  {
    group: "cards", key: "startDetailed", tab: "cards", section: "Details", inPreset: true,
    label: "Start with details on",
    description: "Open the dashboard with the Details button already on.",
    def: bool(false),
  },
  {
    group: "cards", key: "showAge", tab: "cards", section: "Details", inPreset: true,
    label: "Show age",
    description: "The recency dot and how long ago the note changed.",
    def: bool(true),
  },
  {
    group: "cards", key: "showSize", tab: "cards", section: "Details", inPreset: true,
    label: "Show size",
    description: "The file size.",
    def: bool(true),
  },
  {
    group: "cards", key: "showLinks", tab: "cards", section: "Details", inPreset: true,
    label: "Show links",
    description: "How many notes this note links to or is linked from.",
    def: bool(true),
  },
  {
    group: "cards", key: "showTags", tab: "cards", section: "Details", inPreset: true,
    label: "Show tags",
    description: "Tags in the card tooltip and the info panel.",
    def: bool(true),
  },
  {
    group: "cards", key: "showStatus", tab: "cards", section: "Details", inPreset: true,
    label: "Show status",
    description: "The coloured status chip.",
    def: bool(true),
  },
  {
    group: "cards", key: "statusProperty", tab: "cards", section: "Details", inPreset: false,
    label: "Status property",
    description: "The note property whose value shows as the status chip.",
    def: { kind: "text", default: "status", maxLength: 50 },
  },

  // Lines
  {
    group: "lines", key: "curve", tab: "lines", section: "Lines", inPreset: true,
    label: "Curve style",
    description: "How a line leaves one card and reaches the next.",
    def: {
      kind: "enum",
      default: "curved",
      options: [
        { value: "curved", label: "Curved" },
        { value: "step", label: "Step" },
        { value: "straight", label: "Straight" },
      ],
    },
  },
  {
    group: "lines", key: "thickness", tab: "lines", section: "Lines", inPreset: true,
    label: "Line thickness",
    description: "Thickness of the lines between cards.",
    def: number({ min: 0.5, max: 6, step: 0.5, default: 1.5, unit: "px" }),
  },
  {
    group: "lines", key: "dash", tab: "lines", section: "Lines", inPreset: true,
    label: "Dash pattern",
    description: "Whether lines are solid, dashed or dotted.",
    def: {
      kind: "enum",
      default: "dashed",
      options: [
        { value: "solid", label: "Solid" },
        { value: "dashed", label: "Dashed" },
        { value: "dotted", label: "Dotted" },
      ],
    },
  },
  {
    group: "lines", key: "flowSpeed", tab: "lines", section: "Lines", inPreset: true,
    label: "Flow speed",
    description: "How fast dashes travel along the lines. 0 turns the animation off.",
    def: number({ min: 0, max: 5, step: 0.5, default: 1, zeroMeans: "no animation" }),
  },
  {
    group: "lines", key: "highlightColour", tab: "lines", section: "Lines", inPreset: true,
    label: "Highlight colour",
    description: "Colour of the path from the selected card to the vault. Empty follows the theme accent.",
    def: { kind: "colour", default: "" },
  },

  // Grid
  {
    group: "canvas", key: "grid", tab: "lines", section: "Grid", inPreset: true,
    label: "Grid type",
    description: "The pattern behind the cards.",
    def: {
      kind: "enum",
      default: "dots",
      options: [
        { value: "dots", label: "Dots" },
        { value: "lines", label: "Lines" },
        { value: "none", label: "None" },
      ],
    },
  },
  {
    group: "canvas", key: "gridSize", tab: "lines", section: "Grid", inPreset: true,
    label: "Dot or line size",
    description: "Size of each dot, or thickness of each grid line.",
    def: number({ min: 0.5, max: 4, step: 0.1, default: 1.2, unit: "px" }),
  },
  {
    group: "canvas", key: "gridSpacing", tab: "lines", section: "Grid", inPreset: true,
    label: "Grid spacing",
    description: "Distance between grid dots or lines.",
    def: number({ min: 10, max: 60, step: 2, default: 22, unit: "px" }),
  },
  {
    group: "canvas", key: "gridOpacity", tab: "lines", section: "Grid", inPreset: true,
    label: "Grid opacity",
    description: "How strongly the grid shows.",
    def: number({ min: 0, max: 100, step: 5, default: 100, unit: "%" }),
  },
  {
    group: "canvas", key: "gridColour", tab: "lines", section: "Grid", inPreset: true,
    label: "Grid colour",
    description: "Empty follows the theme.",
    def: { kind: "colour", default: "" },
  },

  // Layout
  {
    group: "layout", key: "defaultLayout", tab: "layout", section: "Layout", inPreset: true,
    label: "Default layout",
    description: "The layout the dashboard opens with.",
    def: {
      kind: "enum",
      default: "vertical",
      options: [
        { value: "vertical", label: "Vertical" },
        { value: "radial", label: "Radial" },
        { value: "mindmap", label: "Mind map" },
      ],
    },
  },
  {
    group: "layout", key: "mindMapView", tab: "layout", section: "Layout", inPreset: false,
    label: "Mind map view",
    description: "Balanced spreads the branches to both sides of the vault. One-sided grows everything to the right. The Mind map button in the toolbar switches between them.",
    def: {
      kind: "enum",
      default: "balanced",
      options: [
        { value: "balanced", label: "Balanced" },
        { value: "oneSided", label: "One-sided" },
      ],
    },
  },
  {
    group: "layout", key: "density", tab: "layout", section: "Layout", inPreset: false,
    label: "Density",
    description: "Compact draws smaller cards with tighter spacing and leaves your own sizes untouched, so switching back restores them exactly. The Compact button in the toolbar switches it.",
    def: {
      kind: "enum",
      default: "comfortable",
      options: [
        { value: "comfortable", label: "Comfortable" },
        { value: "compact", label: "Compact" },
      ],
    },
  },
  {
    group: "layout", key: "gap", tab: "layout", section: "Spacing", inPreset: true,
    label: "Card gap",
    description: "Horizontal space between neighbouring cards in the vertical layout.",
    def: number({ min: 4, max: 60, step: 2, default: 14, unit: "px" }),
  },
  {
    group: "layout", key: "levelGap", tab: "layout", section: "Spacing", inPreset: true,
    label: "Level spacing",
    description: "Vertical space between one level and the next in the vertical layout.",
    def: number({ min: 16, max: 120, step: 2, default: 44, unit: "px" }),
  },
  {
    group: "layout", key: "ringRadius", tab: "layout", section: "Spacing", inPreset: true,
    label: "First ring radius",
    description: "Distance from the vault to the first ring in the radial layout. The next rings are spaced from it.",
    def: number({ min: 60, max: 260, step: 5, default: 125, unit: "px" }),
  },
  {
    group: "layout", key: "ringStep", tab: "layout", section: "Spacing", inPreset: true,
    label: "Ring step",
    description: "Extra distance for each ring beyond the fourth in the radial layout.",
    def: number({ min: 40, max: 200, step: 5, default: 90, unit: "px" }),
  },
  {
    group: "layout", key: "overflowLimit", tab: "layout", section: "Folders", inPreset: true,
    label: "List limit",
    description: "How many items a folder lists before the rest collapse into a \"+N more\" card.",
    def: number({ min: 2, max: 30, step: 1, default: 6 }),
  },
  {
    group: "layout", key: "startExpandFolders", tab: "layout", section: "Folders", inPreset: true,
    label: "Start with all folders open",
    description: "Open the dashboard with Expand folders already on.",
    def: bool(false),
  },
  {
    group: "layout", key: "startExpandFiles", tab: "layout", section: "Folders", inPreset: true,
    label: "Start with files shown",
    description: "Open the dashboard with Expand files already on.",
    def: bool(false),
  },

  // Editing
  {
    group: "editing", key: "startLocked", tab: "editing", section: "Editing", inPreset: false,
    label: "Start locked",
    description: "Open the dashboard locked, so nothing can be changed by accident.",
    def: bool(true),
  },
  {
    group: "editing", key: "autoRelockMinutes", tab: "editing", section: "Editing", inPreset: false,
    label: "Lock again after",
    description: "Minutes without an edit before the dashboard locks again. 0 means never.",
    def: number({ min: 0, max: 60, step: 1, default: 5, unit: "min", zeroMeans: "never" }),
  },
  {
    group: "editing", key: "allowDrag", tab: "editing", section: "Editing", inPreset: false,
    label: "Allow drag to move",
    description: "Move notes and folders by dragging a card onto a folder.",
    def: bool(true),
  },
  {
    group: "editing", key: "confirmThreshold", tab: "editing", section: "Editing", inPreset: false,
    label: "Confirm folder actions above",
    description: "Moving or deleting a folder with more files than this asks for confirmation.",
    def: number({ min: 1, max: 200, step: 1, default: 5, unit: "files" }),
  },
  {
    group: "editing", key: "deleteBehaviour", tab: "editing", section: "Editing", inPreset: false,
    label: "Delete behaviour",
    description: "Whether to ask before moving a note to the trash. Obsidian's own trash setting still applies.",
    def: {
      kind: "enum",
      default: "ask",
      options: [
        { value: "ask", label: "Ask first" },
        { value: "immediate", label: "Delete straight away" },
      ],
    },
  },
];

/** The tabs on the settings page, in order. Editing is added with editing itself. */
export const TABS: readonly { id: TabId; label: string }[] = [
  { id: "cards", label: "Cards" },
  { id: "lines", label: "Lines and grid" },
  { id: "layout", label: "Layout" },
  { id: "editing", label: "Editing" },
  { id: "presets", label: "Presets" },
];

export function fieldId(field: Pick<Field, "group" | "key">): string {
  return `${field.group}.${field.key}`;
}

const BY_ID = new Map(FIELDS.map((field) => [fieldId(field), field]));

export function findField(id: string): Field | undefined {
  return BY_ID.get(id);
}

type Loose = Record<string, Record<string, unknown>>;

export function getFieldValue(settings: IslandTreeSettings, field: Field): unknown {
  return (settings as unknown as Loose)[field.group]?.[field.key];
}

/** Returns a copy of the settings with one field replaced. */
export function withFieldValue(
  settings: IslandTreeSettings,
  field: Field,
  value: SettingValue,
): IslandTreeSettings {
  const loose = settings as unknown as Loose;
  return { ...settings, [field.group]: { ...loose[field.group], [field.key]: value } };
}

/** The defaults, built from the table so they can never disagree with it. */
function buildDefaults(): IslandTreeSettings {
  const groups: Record<GroupKey, Record<string, SettingValue>> = {
    cards: {},
    lines: {},
    canvas: {},
    layout: {},
    editing: {},
  };
  for (const field of FIELDS) groups[field.group][field.key] = field.def.default;
  return { version: SETTINGS_VERSION, ...groups, presets: [] } as unknown as IslandTreeSettings;
}

export const DEFAULT_SETTINGS: IslandTreeSettings = buildDefaults();
