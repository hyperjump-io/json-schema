import { siblingKeyword } from "../utilities.js";
import itemsKeyword from "../items.js";
import keywordSchema from "./additionalItems.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle } from "../../keyword.d.ts"
 */

/**
 * `additionalItems` in draft-04 through 2019-09. It applies to the items
 * after the ones the sibling `items` applies to when that's an array of
 * schemas. Otherwise, it has no effect.
 *
 * @type Keyword<{ handle: SchemaHandle; start: number } | null>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/additionalItems",
  shape: "schema",
  schema: keywordSchema,
  async compile(valueNode, context) {
    const itemsNode = siblingKeyword(context.schemaNode, "https://json-schema.org/keyword/draft-04/items");
    if (itemsNode?.jsonType !== "array") {
      return null;
    }

    return { handle: await context.compileSchema(valueNode), start: itemsNode.children.length };
  },
  evaluate: (compiled, context) => compiled === null
    ? undefined
    : /** @type NonNullable<typeof itemsKeyword.evaluate> */ (itemsKeyword.evaluate)(compiled, context),
  simpleApplicator: true
};
