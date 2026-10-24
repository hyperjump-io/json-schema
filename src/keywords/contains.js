/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 */

/**
 * `contains`. The number of items that pass has to be between the sibling
 * `minContains` (default 1) and `maxContains` (default unlimited), which
 * have no effect on their own. The items that pass are evaluated.
 *
 * @type Keyword<Expression>
 */
export default {
  uri: "https://json-schema.org/keyword/contains",
  siblings: { minContains: "https://json-schema.org/keyword/minContains", maxContains: "https://json-schema.org/keyword/maxContains" },
  shape: "schema",
  lower: (schema, { minContains, maxContains }) => ({
    op: "contains",
    of: schema,
    min: typeof minContains === "number" ? minContains : 1,
    max: typeof maxContains === "number" ? maxContains : null
  })
};
