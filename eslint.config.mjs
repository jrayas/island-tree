// Lint rules: TypeScript recommended plus the official Obsidian community
// plugin rules, so submission checks run locally before review.
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  ...tseslint.configs.recommended,
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: { project: "./tsconfig.json" },
    },
  },
  {
    // Svelte's runes are compiler syntax, not real globals, in `.svelte.ts` files.
    files: ["src/**/*.svelte.ts"],
    languageOptions: {
      globals: { $state: "readonly", $derived: "readonly", $effect: "readonly" },
    },
  },
  {
    // Tests stand in for the browser's timers, so they must call the plain ones.
    files: ["src/**/*.test.ts"],
    rules: { "obsidianmd/prefer-window-timers": "off" },
  },
  { ignores: ["main.js", "node_modules/**", "**/*.svelte"] },
];
