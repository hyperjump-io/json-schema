#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { args } from "unified-args";
import { jsonschema } from "./jsonschema.js";

/**
 * @typedef {{
 *   version: string;
 * }} Package
 */

const packageJsonUrl = new URL("../../package.json", import.meta.url);

/** @type Package */
const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8"));

// The engine finds files by `path.extname`, which is `.json` for a
// `.schema.json` file. Plain JSON files are never schemas, so they're ignored.
// These come before the user's patterns, so `!file.json` still includes one.
process.argv.splice(2, 0, "--ignore-pattern", "*.json,!*.schema.json");

args({
  description: "CLI to lint JSON Schemas",
  extensions: ["json"],
  ignoreName: ".jsonschemaignore",
  name: "jsonschema",
  packageField: "jsonSchemaConfig",
  pluginPrefix: "jsonschema",
  processor: jsonschema,
  rcName: ".jsonschemarc",
  version: `jsonschema: ${packageJson.version}`
});
