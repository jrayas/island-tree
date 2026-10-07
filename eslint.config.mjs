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
  { ignores: ["main.js", "node_modules/**", "**/*.svelte"] },
];
