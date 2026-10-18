import keywordSchema from "./else.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `else`. It has no effect on its own. The sibling `if` evaluates it.
 *
 * @type Keyword<null>
 */
export default {
  uri: "https://json-schema.org/keyword/else",
  shape: "schema",
  schema: keywordSchema,
  compile: () => null
};
