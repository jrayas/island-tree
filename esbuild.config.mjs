// Bundles src/main.ts (and the Svelte components it mounts) into main.js,
// the single file Obsidian loads. `node esbuild.config.mjs` watches for changes;
// adding `production` builds once without source maps.
import esbuild from "esbuild";
import esbuildSvelte from "esbuild-svelte";
import process from "process";
import builtins from "builtin-modules";

const production = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
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
  outfile: "main.js",
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
