import { siblingKeyword } from "./utilities.js";
import keywordSchema from "./items.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `items` since 2020-12. It applies to the items after the ones the sibling
 * `prefixItems` applies to.
 *
 * @type Keyword<{ handle: SchemaHandle; start: number }>
 */
export default {
  uri: "https://json-schema.org/keyword/items",
  shape: "schema",
  schema: keywordSchema,
  async compile(valueNode, context) {
    const prefixItemsNode = siblingKeyword(context.schemaNode, "https://json-schema.org/keyword/prefixItems");
    const start = prefixItemsNode?.jsonType === "array" ? prefixItemsNode.children.length : 0;

    return { handle: await context.compileSchema(valueNode), start };
  },
  evaluate({ handle, start }, { instance, schema, alwaysPasses, exhaustive, markEvaluated }) {
    if (alwaysPasses(handle)) {
      return;
    }

    const evaluate = schema(handle);

    return (node) => {
      if (instance.typeOf(node) !== "array") {
        return true;
      }

      let valid = true;
      let index = 0;
      for (const item of instance.items(node)) {
        if (index >= start) {
          if (evaluate(item, index)) {
            markEvaluated?.(index);
          } else {
            valid = false;
            if (!exhaustive) {
              return false;
            }
          }
        }
        index++;
      }

      return valid;
    };
  },
  simpleApplicator: true
};
