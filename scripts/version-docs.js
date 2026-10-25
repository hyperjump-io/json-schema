// Run by `npm version`, after the version is bumped and before it's
// committed: what the docs say is coming soon is added in this version.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const version = /** @type string */ (process.env.npm_package_version);

// A prerelease isn't a release, so what's in it is still coming soon.
if (!version.includes("-")) {
  for (const file of await readdir("website", { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith(".md")) {
      continue;
    }
    const path = join(file.parentPath, file.name);
    const markdown = await readFile(path, "utf8");
    const released = markdown.replaceAll(/^\*Coming soon\*$/gm, `*Added in v${version}*`);
    if (released !== markdown) {
      await writeFile(path, released);
    }
  }
}
