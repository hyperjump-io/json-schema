import { string } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `format`. It's always an annotation. It also validates if the
 * `validateFormats` config says so, or the dialect does by default. Then
 * the format has to be one the dialect supports, and its definition has to
 * have been added, or the schema can't be compiled.
 *
 * @type Keyword<string>
 */
export default {
  uri: "https://json-schema.org/keyword/format",
  shape: "data",
  check: string,
  lower(name, _siblings, { jsonSchema, dialect }) {
    const uri = dialect.formats && Object.hasOwn(dialect.formats, name) ? dialect.formats[name] : null;
    const assert = jsonSchema.config.validateFormats ?? dialect.assertFormats ?? false;
    if (assert) {
      if (uri === null) {
        throw Error(`The '${name}' format isn't supported in the '${dialect.uri}' dialect`);
      }
      jsonSchema.getFormat(uri);
    }

    return { op: "format", name, uri, assert };
  }
};
