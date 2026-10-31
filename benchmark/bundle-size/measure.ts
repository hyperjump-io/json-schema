// Bundles each entry in entries/ on its own and prints raw and gzipped sizes:
// the chunk that loads up front, and everything including chunks loaded by
// `import()`. The entries import @hyperjump/json-schema, which is this
// package: npm run bundle-size
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { bundle, upFront } from "./bundle.ts";

const entriesDir = fileURLToPath(new URL("entries", import.meta.url));
const entries = (await readdir(entriesDir)).filter((name) => name.endsWith(".js")).sort();

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;
const sizes = (code: string) => ({ raw: Buffer.byteLength(code), gzip: gzipSync(code, { level: 9 }).length });

console.log("| Entry | Up front | Up front, gzipped | Total | Total, gzipped |");
console.log("| --- | --- | --- | --- | --- |");
for (const entry of entries) {
  const chunks = await bundle(`${entriesDir}/${entry}`);
  const code = (counted: typeof chunks) => counted.map((chunk) => chunk.code).join("");
  const initial = sizes(code(upFront(chunks)));
  const total = sizes(code(chunks));
  console.log(`| ${entry.replace(/\.js$/, "")} | ${kb(initial.raw)} | ${kb(initial.gzip)} | ${kb(total.raw)} | ${kb(total.gzip)} |`);
}
