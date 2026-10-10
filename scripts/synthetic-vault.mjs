/**
 * Writes a made-up vault of real files, to open in Obsidian and try the dashboard on a big vault.
 *
 *   node scripts/synthetic-vault.mjs <empty folder> [balanced|flat|deep]
 *
 * balanced: 100 areas, each with 5 topics of 20 notes (10,000 notes), the usual shape.
 * flat:     one folder holding 10,000 notes, the worst case for a single folder.
 * deep:     a chain of 60 folders with 5 notes at each level.
 *
 * It only ever writes into a folder that is missing or empty, and never anywhere else, so it
 * cannot overwrite anything. Open the folder in Obsidian as a new vault ("Open folder as vault").
 * The same shapes are used by the unit test in src/model/perf.test.ts (see src/model/synthetic.ts).
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [, , target, shape = "balanced"] = process.argv;

if (!target || !["balanced", "flat", "deep"].includes(shape)) {
  console.error("Usage: node scripts/synthetic-vault.mjs <empty folder> [balanced|flat|deep]");
  process.exit(1);
}

const root = resolve(target);
if (existsSync(root) && readdirSync(root).length > 0) {
  console.error(`Refusing to write into ${root}: it is not empty. Pick a new or empty folder.`);
  process.exit(1);
}
mkdirSync(root, { recursive: true });

let written = 0;

function note(dir, index) {
  mkdirSync(dir, { recursive: true });
  const title = `note ${index + 1}`;
  const body = `# ${title}\n\nA made-up note for trying Island tree on a large vault.\n\n- tags: #synthetic\n- number: ${index + 1}\n`;
  writeFileSync(join(dir, `${title}.md`), body);
  written += 1;
}

if (shape === "balanced") {
  for (let a = 1; a <= 100; a++) {
    for (let t = 1; t <= 5; t++) {
      for (let n = 0; n < 20; n++) note(join(root, `Area ${a}`, `Topic ${t}`), n);
    }
  }
} else if (shape === "flat") {
  for (let n = 0; n < 10_000; n++) note(join(root, "Everything"), n);
} else {
  let dir = root;
  for (let level = 0; level <= 60; level++) {
    for (let n = 0; n < 5; n++) note(dir, n);
    dir = join(dir, `Level ${level + 1}`);
  }
}

console.log(`Wrote ${written.toLocaleString()} notes (${shape}) to ${root}`);
