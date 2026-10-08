// Bundles src/main.ts (and the Svelte components it mounts) into main.js,
// the single file Obsidian loads. `node esbuild.config.mjs` watches for changes;
// adding `production` builds once without source maps.
import esbuild from "esbuild";
import esbuildSvelte from "esbuild-svelte";
import process from "process";
import builtins from "builtin-modules";

const production = process.argv[2] === "production";

const context = await esbuild.context({
  // main.ts becomes main.js; styles.css is bundled with Svelte Flow's stylesheet
  // into the styles.css Obsidian loads, so no style elements are injected at runtime.
  entryPoints: { main: "src/main.ts", styles: "src/styles.css" },
  bundle: true,
  // Obsidian and Electron provide these at runtime, so they must not be bundled.
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  plugins: [
    esbuildSvelte({
      compilerOptions: { css: "injected", dev: !production },
      // Warnings inside node_modules are the libraries' to fix, not ours.
      filterWarnings: (warning) => !warning.filename?.includes("node_modules"),
    }),
  ],
  mainFields: ["svelte", "browser", "module", "main"],
  conditions: ["svelte", "browser"],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  minify: production,
  outdir: ".",
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
