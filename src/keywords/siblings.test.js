import { readdir, readFile } from "node:fs/promises";
import { describe, test, expect } from "vitest";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

const directory = new URL(".", import.meta.url);

// Every keyword definition, by its path relative to this directory
const paths = (await readdir(directory, { recursive: true }))
  .filter((path) => path.endsWith(".js") && !path.endsWith(".test.js"))
  .sort();

describe("A keyword declares the siblings it reads", () => {
  for (const path of paths) {
    test(path, async () => {
      const { default: keyword } = /** @type {{ default?: Keyword }} */ (await import(new URL(path, directory).href));
      if (keyword?.uri === undefined) {
        // Not a keyword, like the utilities
        return;
      }

      const source = await readFile(new URL(path, directory), "utf8");
      const read = [...source.matchAll(/siblingKeyword\([^,]+,\s*"([^"]+)"\)/g)].map(([, uri]) => uri);
      expect([...keyword.siblings ?? []].sort()).to.eql([...new Set(read)].sort());
    });
  }
});
