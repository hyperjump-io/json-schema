import { recordFileSet } from "./jsonschema.js";

/**
 * @import { Processor } from "unified"
 * @import { FileSet } from "./jsonschema.js"
 */

/**
 * The engine gives the set of files it's processing to plugins from
 * configuration, not to the processor's own plugins. The CLI adds this one
 * with `--use`, so the processor knows every file it was given.
 *
 * @this {Processor}
 * @param {unknown} _options
 * @param {FileSet} [fileSet]
 * @returns {undefined}
 */
export default function jsonSchemaFileSet(_options, fileSet) {
  if (fileSet) {
    recordFileSet(this, fileSet);
  }
}
