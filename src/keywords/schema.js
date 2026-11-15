/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$schema` identifies the dialect of a schema resource. The dialect has to
 * be known before any other keyword can be interpreted, so it's read by name,
 * and it's part of every dialect. `jsonSchemaMediaTypes` adds it to every
 * set of definitions. The resolver checks its value, because it's needed to find the
 * dialect.
 *
 * @type Keyword<string, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/schema",
  shape: "data"
};
