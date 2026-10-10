/**
 * A small live picture of the dashboard at the top of the settings page.
 *
 * It uses the real layout, branch and card styles with three sample cards, so
 * what you see changes exactly as the dashboard will when you move a control.
 */
import { setIcon } from "obsidian";
import { branchPath } from "../layout/edgePath";
import { computeLayout } from "../layout/layout";
import type { LayoutNode } from "../layout/types";
import { cardRow, describeMeta } from "../model/meta";
import { settingsToCssVars } from "./cssVars";
import { previewGrid } from "./format";
import type { IslandTreeSettings } from "./schema";
import type { SettingsStore } from "./store";

const SAMPLE: LayoutNode = {
  id: "vault",
  children: [
    { id: "folder", children: [] },
    { id: "note", children: [] },
  ],
};

/** The preview is always drawn at this size, with the scene scaled to fit. */
const STAGE_HEIGHT = 190;
const STAGE_PADDING = 16;

function sampleMeta(): ReturnType<typeof describeMeta> {
  const now = Date.now();
  return describeMeta(
    { mtime: now - 3 * 24 * 60 * 60 * 1000, size: 2048, outgoing: 2, incoming: 1, tags: ["#plan"], status: "review" },
    now,
  );
}

function drawCard(
  scene: HTMLElement,
  settings: IslandTreeSettings,
  kind: "folder" | "file",
  label: string,
  icon: string,
  centre: { x: number; y: number },
  size: { width: number; height: number },
  selected: boolean,
): void {
  const holder = scene.createDiv({ cls: "island-preview-card" });
  holder.setCssProps({
    left: `${centre.x - size.width / 2}px`,
    top: `${centre.y - size.height / 2}px`,
    width: `${size.width}px`,
    height: `${size.height}px`,
  });
  const card = holder.createDiv({
    cls: `island-card${kind === "folder" ? " island-card-folder" : ""}${selected ? " island-card-selected" : ""}`,
  });
  const row = card.createDiv({ cls: "island-card-row" });
  setIcon(row.createSpan({ cls: "island-card-icon" }), icon);
  row.createSpan({ cls: "island-card-name", text: label });
  if (kind === "folder") row.createSpan({ cls: "island-card-badge", text: "1·3" });

  if (settings.cards.startDetailed) {
    const meta = card.createDiv({ cls: "island-card-meta" });
    if (kind === "folder") {
      meta.createSpan({ text: "4 items" });
    } else {
      const parts = cardRow(sampleMeta(), {
        age: settings.cards.showAge,
        size: settings.cards.showSize,
        links: settings.cards.showLinks,
        status: settings.cards.showStatus,
      });
      if (parts?.dot) meta.createSpan({ cls: `island-dot island-dot-${parts.dot}` });
      if (parts?.text) meta.createSpan({ text: parts.text });
      if (parts?.status) {
        meta.createSpan({ cls: `island-chip island-chip-${parts.status.kind}`, text: parts.status.label });
      }
    }
  }
}

/** Draws the preview into `container` and keeps it up to date. Returns a function that stops. */
export function renderPreview(container: HTMLElement, store: SettingsStore): () => void {
  const root = container.createDiv({ cls: "island-tree-view island-preview" });
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", "Preview of the dashboard with the current settings");
  const stage = root.createDiv({ cls: "island-preview-stage" });

  const draw = (settings: IslandTreeSettings): void => {
    root.setCssProps(settingsToCssVars(settings));
    stage.empty();

    const layout = computeLayout("vertical", SAMPLE, settings.cards.startDetailed, {
      cardWidth: settings.cards.width,
      cardHeight: settings.cards.height,
      gap: settings.layout.gap,
      levelGap: settings.layout.levelGap,
      ringRadius: settings.layout.ringRadius,
      ringStep: settings.layout.ringStep,
    });

    const grid = previewGrid(settings.canvas.grid, settings.canvas.gridSize, settings.canvas.gridSpacing);
    stage.setCssProps({ "--preview-grid-image": grid.image, "--preview-grid-size": grid.size });

    const available = Math.max(120, (stage.clientWidth || 360) - STAGE_PADDING * 2);
    const scale = Math.min(1, available / layout.width, (STAGE_HEIGHT - STAGE_PADDING * 2) / layout.height);
    const scene = stage.createDiv({ cls: "island-preview-scene" });
    scene.setCssProps({
      width: `${layout.width}px`,
      height: `${layout.height}px`,
      transform: `translate(-50%, -50%) scale(${scale})`,
    });

    const svg = scene.createSvg("svg", { cls: "island-preview-lines" });
    svg.setAttribute("width", String(layout.width));
    svg.setAttribute("height", String(layout.height));
    const root_ = layout.positions.get("vault");
    for (const [id, highlighted] of [["folder", false], ["note", true]] as const) {
      const to = layout.positions.get(id);
      if (!root_ || !to) continue;
      // An array, not a space-separated string: Obsidian's `createSvg` passes a string straight to
      // `classList.add`, which throws on a space (unlike `createEl`, which sets `className`).
      const path = svg.createSvg("path", {
        cls: highlighted ? ["island-edge", "island-edge-highlight"] : ["island-edge"],
      });
      path.setAttribute("d", branchPath(settings.lines.curve, null, root_.x, root_.y, to.x, to.y));
    }

    const at = (id: string): { x: number; y: number } => layout.positions.get(id) ?? { x: 0, y: 0 };
    drawCard(scene, settings, "folder", "Vault", "folder-open", at("vault"), layout.cardSize, false);
    drawCard(scene, settings, "folder", "Projects", "folder", at("folder"), layout.cardSize, false);
    drawCard(scene, settings, "file", "Roadmap.md", "file-text", at("note"), layout.cardSize, true);
  };

  return store.subscribe(draw);
}
