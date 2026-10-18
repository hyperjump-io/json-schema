import keywordSchema from "./then.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `then`. It has no effect on its own. The sibling `if` evaluates it.
 *
 * @type Keyword<null>
 */
export default {
  uri: "https://json-schema.org/keyword/then",
  shape: "schema",
  schema: keywordSchema,
  compile: () => null
};
