import { compileSchemaArray } from "../utilities.js";
import itemsKeyword from "../items.js";
import prefixItemsKeyword from "../prefixItems.js";
import { nonEmpty } from "../checks.js";

/**
 * @import { Keyword, SchemaHandle } from "../../keyword.d.ts"
 */

/**
 * `items` in draft-04 through 2019-09. An array of schemas applies to the
 * items at the same index, like `prefixItems`. A schema applies to every
 * item, like `items` without `prefixItems`.
 *
 * @type Keyword<SchemaHandle | SchemaHandle[]>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-2019-09/items",
  shape: ["schema", { array: "schema" }],
  check: nonEmpty,
  compile: (valueNode, context) => valueNode.jsonType === "array"
    ? compileSchemaArray(valueNode, context)
    : context.compileSchema(valueNode),
  evaluate: (compiled, context) => Array.isArray(compiled)
    ? /** @type NonNullable<typeof prefixItemsKeyword.evaluate> */ (prefixItemsKeyword.evaluate)(compiled, context)
    : /** @type NonNullable<typeof itemsKeyword.evaluate> */ (itemsKeyword.evaluate)({ handle: compiled, start: 0 }, context),
  simpleApplicator: true
};
