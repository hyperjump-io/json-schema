import keywordSchema from "./schema.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { JsonSchema } from "../json-schema.d.ts"
 */

/**
 * `$schema` identifies the dialect of a schema resource. The dialect has to
 * be known before any other keyword can be interpreted, so it's read by name,
 * and it's part of every dialect. It's added to every {@link JsonSchema} by
 * default.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/schema",
  shape: "data",
  schema: keywordSchema
};
