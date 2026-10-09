/**
 * Draws one setting as an Obsidian `Setting` row, from its entry in the schema.
 *
 * Because every control is generated from the table, a new setting needs no
 * page code. Each change goes through `coerceField` before it reaches the store,
 * so the page cannot put an invalid value into the settings either.
 */
import { Setting } from "obsidian";
import { formatNumber } from "./format";
import { getFieldValue, withFieldValue, type Field, type SettingValue } from "./schema";
import type { SettingsStore } from "./store";
import { coerceField } from "./validate";

/** Shown in the colour picker when no colour is chosen and the theme's is used. */
const PICKER_PLACEHOLDER = "#888888";

/**
 * Adds one row to `containerEl`. `rerender` redraws the whole tab, which is used
 * after a reset so every control shows its new value.
 */
export function renderField(
  containerEl: HTMLElement,
  store: SettingsStore,
  field: Field,
  rerender: () => void,
): void {
  const setting = new Setting(containerEl).setName(field.label).setDesc(field.description);
  const current = getFieldValue(store.get(), field);

  const apply = (value: unknown): void => {
    const result = coerceField(field, value);
    if (result.status === "rejected") return;
    const checked: SettingValue = result.value;
    store.update((settings) => withFieldValue(settings, field, checked));
  };

  const def = field.def;
  switch (def.kind) {
    case "number": {
      const valueEl = setting.controlEl.createSpan({ cls: "island-setting-value" });
      valueEl.setText(formatNumber(def, current as number));
      setting.addSlider((slider) =>
        slider
          .setLimits(def.min, def.max, def.step)
          .setValue(current as number)
          .onChange((value) => {
            apply(value);
            valueEl.setText(formatNumber(def, value));
          }),
      );
      break;
    }
    case "enum":
      setting.addDropdown((dropdown) => {
        for (const option of def.options) dropdown.addOption(option.value, option.label);
        dropdown.setValue(current as string).onChange(apply);
      });
      break;
    case "boolean":
      setting.addToggle((toggle) => toggle.setValue(current as boolean).onChange(apply));
      break;
    case "colour":
      setting.addColorPicker((picker) =>
        picker.setValue(current === "" ? PICKER_PLACEHOLDER : (current as string)).onChange(apply),
      );
      setting.addExtraButton((button) =>
        button
          .setIcon("palette")
          .setTooltip("Use the theme colour")
          .onClick(() => {
            apply("");
            rerender();
          }),
      );
      break;
    case "text":
      setting.addText((text) =>
        text
          .setPlaceholder(def.default)
          .setValue(current as string)
          .onChange(apply),
      );
      break;
  }

  setting.addExtraButton((button) =>
    button
      .setIcon("rotate-ccw")
      .setTooltip("Reset to default")
      .onClick(() => {
        apply(def.default);
        rerender();
      }),
  );
}
