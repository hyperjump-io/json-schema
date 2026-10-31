import { string } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `format`. It's always an annotation. It also validates if the dialect
 * says so (`assertFormats`, which the `validateFormats` config sets). Then
 * the format has to be one the dialect supports, and its definition has to
 * have been added, or the schema can't be compiled. The definition is
 * checked with the kernel's other definitions.
 *
 * @type Keyword<string, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/format",
  shape: "data",
  check: string,
  lower(name, _siblings, { dialect }) {
    const uri = dialect.formats && Object.hasOwn(dialect.formats, name) ? dialect.formats[name] : null;
    const assert = dialect.assertFormats ?? false;
    if (assert && uri === null) {
      throw Error(`The '${name}' format isn't supported in the '${dialect.uri}' dialect`);
    }

    return { op: "format", name, uri, assert };
  }
};
