import { string } from "./checks.js";

/**
 * @import { Dialect } from "../dialect.d.ts"
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `format`. It's always an annotation. It also validates if the dialect
 * says so (`assertFormats`, which the `validateFormats` config sets). Then
 * the format has to be one the dialect supports, which `check` reports as
 * a problem in the schema, and its definition has to have been added, or
 * the schema can't be compiled. The definition is checked with the
 * kernel's other definitions.
 *
 * @type Keyword<string, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/format",
  shape: "data",
  check(node, context) {
    string(node, context);
    const { dialect } = context;
    if (dialect.assertFormats && node.jsonType === "string" && !hasFormat(dialect, node.value)) {
      context.message(`The '${node.value}' format isn't supported in the '${dialect.uri}' dialect`);
    }
  },
  lower(name, _siblings, { dialect }) {
    const uri = hasFormat(dialect, name) ? /** @type Record<string, string> */ (dialect.formats)[name] : null;
    return { op: "format", name, uri, assert: dialect.assertFormats ?? false };
  }
};

/** @type (dialect: Dialect, name: string) => boolean */
const hasFormat = (dialect, name) => dialect.formats !== undefined && Object.hasOwn(dialect.formats, name);
