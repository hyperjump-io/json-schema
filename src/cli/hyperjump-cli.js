#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { args } from "unified-args";
import { hyperjump } from "./hyperjump.js";

/**
 * @typedef {{
 *   version: string;
 * }} Package
 */

const packageJsonUrl = new URL("../../package.json", import.meta.url);

/** @type Package */
const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8"));

// It's a linter and a validator, so it doesn't write files back out unless
// it's asked to with `--stdout` or `--output`, which come after this and win
process.argv.splice(2, 0, "--no-stdout");

// The engine only gives the set of files it's processing to plugins from
// configuration, so the CLI's processor gets it from this one
process.argv.splice(2, 0, "--use", fileURLToPath(new URL("./file-set.js", import.meta.url)));

args({
  description: "CLI to lint JSON Schemas and validate JSON against them",
  extensions: ["json"],
  ignoreName: ".hyperjumpignore",
  name: "hyperjump",
  packageField: "hyperjumpConfig",
  pluginPrefix: "hyperjump",
  processor: hyperjump,
  rcName: ".hyperjumprc",
  version: `hyperjump: ${packageJson.version}`
});
