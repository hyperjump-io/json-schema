// Which directories and packages an entry's bundle is made of, by rendered
// size before minifying, up front only unless --all:
// node benchmark/bundle-size/breakdown.ts benchmark/bundle-size/entries/v1-validate-flag.js [--all]
import { resolve } from "node:path";

import { bundle, upFront } from "./bundle.ts";

const [entry] = process.argv.slice(2);
const chunks = await bundle(resolve(entry));
const counted = process.argv.includes("--all") ? chunks : upFront(chunks);

const groups = new Map<string, number>();
for (const chunk of counted) {
  for (const [id, module] of Object.entries(chunk.modules)) {
    const path = id.replace(/.*\/node_modules\//, "nm:").replace(/.*hyperjump-io\//, "");
    // A package, or the first three segments of a path in a repo
    const segments = path.split("/");
    const length = path.startsWith("nm:") ? (path.includes("@") ? 2 : 1) : 3;
    const key = segments.slice(0, length).join("/");
    groups.set(key, (groups.get(key) ?? 0) + module.renderedLength);
  }
}

for (const [key, size] of [...groups].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log((size / 1024).toFixed(1).padStart(7), key);
}
