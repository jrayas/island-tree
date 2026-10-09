/**
 * The small dialogs the settings page needs: ask for a name, ask to confirm, and
 * summarise an import before it is applied.
 *
 * Each returns a promise that settles exactly once when the dialog closes, so
 * callers can simply `await` the answer.
 */
import { Modal, Setting, type App } from "obsidian";
import type { ImportResult } from "./importExport";

/** Shows at most this many lines of each kind in the import summary. */
const SUMMARY_LINES = 8;

class TextPromptModal extends Modal {
  private result: string | null = null;
  private settled = false;

  constructor(
    app: App,
    private readonly options: {
      title: string;
      label: string;
      initial: string;
      confirmLabel: string;
      /** Returns a message to show and block the answer, or null when the text is fine. */
      validate: (text: string) => string | null;
    },
    private readonly done: (value: string | null) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.options.title);
    let text = this.options.initial;
    const error = this.contentEl.createDiv({ cls: "island-modal-error" });

    const submit = (): void => {
      const problem = this.options.validate(text);
      if (problem) {
        error.setText(problem);
        return;
      }
      this.result = text;
      this.close();
    };

    new Setting(this.contentEl).setName(this.options.label).addText((input) => {
      input.setValue(text).onChange((value) => {
        text = value;
        error.setText("");
      });
      input.inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
      });
      window.setTimeout(() => input.inputEl.focus(), 0);
    });

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(this.options.confirmLabel).setCta().onClick(submit))
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.settled) return;
    this.settled = true;
    this.done(this.result);
  }
}

/** Asks for a line of text. Resolves to the text, or null if the dialog was cancelled. */
export function promptForText(
  app: App,
  options: {
    title: string;
    label: string;
    initial?: string;
    confirmLabel: string;
    validate: (text: string) => string | null;
  },
): Promise<string | null> {
  return new Promise((resolve) => {
    new TextPromptModal(app, { initial: "", ...options }, resolve).open();
  });
}

class ConfirmModal extends Modal {
  private answer = false;
  private settled = false;

  constructor(
    app: App,
    private readonly options: { title: string; message: string; confirmLabel: string; warning: boolean },
    private readonly done: (value: boolean) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.options.title);
    this.contentEl.createEl("p", { text: this.options.message });
    new Setting(this.contentEl)
      .addButton((button) => {
        button.setButtonText(this.options.confirmLabel).onClick(() => {
          this.answer = true;
          this.close();
        });
        // The warning style is a class; the helper for it needs a newer Obsidian than we support.
        if (this.options.warning) button.buttonEl.addClass("mod-warning");
        else button.setCta();
      })
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.settled) return;
    this.settled = true;
    this.done(this.answer);
  }
}

/** Asks a yes or no question. Resolves to true only if the person confirmed. */
export function confirmAction(
  app: App,
  options: { title: string; message: string; confirmLabel: string; warning?: boolean },
): Promise<boolean> {
  return new Promise((resolve) => {
    new ConfirmModal(app, { warning: false, ...options }, resolve).open();
  });
}

type SuccessfulImport = Extract<ImportResult, { ok: true }>;

class ImportSummaryModal extends Modal {
  private answer = false;
  private settled = false;

  constructor(
    app: App,
    private readonly result: SuccessfulImport,
    private readonly done: (value: boolean) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { report, presetsAdded, presetsSkipped } = this.result;
    this.setTitle("Import settings");
    const { contentEl } = this;

    contentEl.createEl("p", {
      text: `${report.applied} ${report.applied === 1 ? "setting" : "settings"} will be applied. ${report.defaulted} not in the file will use their defaults.`,
    });

    const list = (heading: string, lines: string[]): void => {
      if (lines.length === 0) return;
      contentEl.createEl("h4", { text: heading });
      const ul = contentEl.createEl("ul");
      for (const line of lines.slice(0, SUMMARY_LINES)) ul.createEl("li", { text: line });
      if (lines.length > SUMMARY_LINES) {
        ul.createEl("li", { text: `and ${lines.length - SUMMARY_LINES} more` });
      }
    };
    list("Adjusted to fit", report.clamped);
    list("Not allowed, so the default is used", report.rejected);
    list("Ignored", report.ignored);
    list("Presets added", presetsAdded);
    list("Presets skipped because the name is already used", presetsSkipped);

    contentEl.createEl("p", { text: "Applying replaces your current look and behaviour settings. Your saved presets are kept." });

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText("Apply")
          .setCta()
          .onClick(() => {
            this.answer = true;
            this.close();
          }),
      )
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.settled) return;
    this.settled = true;
    this.done(this.answer);
  }
}

/** Shows what an import would do. Resolves to true if the person chose to apply it. */
export function confirmImport(app: App, result: SuccessfulImport): Promise<boolean> {
  return new Promise((resolve) => {
    new ImportSummaryModal(app, result, resolve).open();
  });
}
