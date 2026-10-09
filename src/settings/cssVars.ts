/**
 * Turns settings into CSS variables.
 *
 * Every visual setting is written as a variable on the dashboard's root element,
 * so changing a setting restyles the cards, lines and grid at once without
 * rebuilding anything (SPEC.md section 9). An empty colour, or a text size of 0,
 * points at an Obsidian theme variable so the defaults follow the theme.
 */
import type { IslandTreeSettings } from "./schema";

/** Seconds for one flow cycle at speed 1, and for the highlighted path. */
const FLOW_SECONDS = 1.8;
const HIGHLIGHT_FLOW_SECONDS = 0.7;
/** Compact (radial) text is this fraction of the normal size, as in the mockup (13 to 12). */
const COMPACT_TEXT = 0.92;

const DASH_PATTERNS = { solid: "none", dashed: "4 6", dotted: "1.5 6" } as const;

function seconds(base: number, speed: number): string {
  return `${Math.round((base / speed) * 1000) / 1000}s`;
}

export function settingsToCssVars(settings: IslandTreeSettings): Record<string, string> {
  const { cards, lines, canvas } = settings;
  const animate = lines.flowSpeed > 0;
  const gridBase = canvas.gridColour === "" ? "var(--background-modifier-border-hover)" : canvas.gridColour;

  return {
    "--island-card-radius": `${cards.radius}px`,
    "--island-card-border": `${cards.borderWidth}px`,
    "--island-card-padding-x": `${cards.paddingX}px`,
    "--island-font-size": cards.fontSize === 0 ? "var(--font-ui-small)" : `${cards.fontSize}px`,
    "--island-font-size-compact":
      cards.fontSize === 0 ? "var(--font-ui-smaller)" : `${Math.max(9, Math.round(cards.fontSize * COMPACT_TEXT))}px`,
    "--island-line-width": `${lines.thickness}px`,
    "--island-line-dash": DASH_PATTERNS[lines.dash],
    "--island-line-cap": lines.dash === "dotted" ? "round" : "butt",
    "--island-line-animation": animate
      ? `island-flow ${seconds(FLOW_SECONDS, lines.flowSpeed)} linear infinite`
      : "none",
    "--island-line-animation-highlight": animate
      ? `island-flow ${seconds(HIGHLIGHT_FLOW_SECONDS, lines.flowSpeed)} linear infinite`
      : "none",
    "--island-highlight-colour": lines.highlightColour === "" ? "var(--interactive-accent)" : lines.highlightColour,
    "--island-grid-colour": `color-mix(in srgb, ${gridBase} ${canvas.gridOpacity}%, transparent)`,
  };
}
