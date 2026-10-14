/**
 * Fills one setting's row with its control, from its entry in the schema.
 *
 * Because every control is generated from the table, a new setting needs no
 * page code. Each change goes through `coerceField` before it reaches the store,
 * so the page cannot put an invalid value into the settings either.
 */
import type { Setting } from "obsidian";
import { formatNumber } from "./format";
import { getFieldValue, withFieldValue, type Field, type SettingValue } from "./schema";
import type { SettingsStore } from "./store";
import { coerceField } from "./validate";

/** Shown in the colour picker when no colour is chosen and the theme's is used. */
const PICKER_PLACEHOLDER = "#888888";

/**
 * Adds the control for `field` to `setting`, a row Obsidian has already created from the field's
 * definition. A reset puts the control back in place, so no redraw is needed.
 */
export function configureField(setting: Setting, store: SettingsStore, field: Field): void {
  setting.setName(field.label).setDesc(field.description);
  const current = getFieldValue(store.get(), field);

  const apply = (value: unknown): void => {
    const result = coerceField(field, value);
    if (result.status === "rejected") return;
    const checked: SettingValue = result.value;
    store.update((settings) => withFieldValue(settings, field, checked));
  };

  // Shows a value in the control without applying it: used by the reset buttons.
  let show: (value: unknown) => void = () => undefined;

  const def = field.def;
  switch (def.kind) {
    case "number": {
      const valueEl = setting.controlEl.createSpan({ cls: "island-setting-value" });
      valueEl.setText(formatNumber(def, current as number));
      setting.addSlider((slider) => {
        slider
          .setLimits(def.min, def.max, def.step)
          .setValue(current as number)
          .onChange((value) => {
            apply(value);
            valueEl.setText(formatNumber(def, value));
          });
        show = (value) => {
          slider.setValue(value as number);
          valueEl.setText(formatNumber(def, value as number));
        };
      });
      break;
    }
    case "enum":
      setting.addDropdown((dropdown) => {
        for (const option of def.options) dropdown.addOption(option.value, option.label);
        dropdown.setValue(current as string).onChange(apply);
        show = (value) => {
          dropdown.setValue(value as string);
        };
      });
      break;
    case "boolean":
      setting.addToggle((toggle) => {
        toggle.setValue(current as boolean).onChange(apply);
        show = (value) => {
          toggle.setValue(value as boolean);
        };
      });
      break;
    case "colour":
      setting.addColorPicker((picker) => {
        picker.setValue(current === "" ? PICKER_PLACEHOLDER : (current as string)).onChange(apply);
        show = (value) => {
          picker.setValue(value === "" ? PICKER_PLACEHOLDER : (value as string));
        };
      });
      setting.addExtraButton((button) =>
        button
          .setIcon("palette")
          .setTooltip("Use the theme colour")
          .onClick(() => {
            apply("");
            show("");
          }),
      );
      break;
    case "text":
      setting.addText((text) => {
        text
          .setPlaceholder(def.default)
          .setValue(current as string)
          .onChange(apply);
        show = (value) => {
          text.setValue(value as string);
        };
      });
      break;
  }

  setting.addExtraButton((button) =>
    button
      .setIcon("rotate-ccw")
      .setTooltip("Reset to default")
      .onClick(() => {
        apply(def.default);
        show(def.default);
      }),
  );
}
