import dependenciesKeyword from "../draft-07/dependencies.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 */

/**
 * `dependencies` in draft-04. It's the same as draft-07's. Draft-04 says an
 * array can't be empty, but an empty one has no effect, so `empty-array`
 * reports it. It has a URI of its own so lint can tell.
 *
 * @type Keyword<[string, Expression | string[]][], { map: ["schema", { array: "data" }] }>
 */
export default {
  ...dependenciesKeyword,
  uri: "https://json-schema.org/keyword/draft-04/dependencies"
};
