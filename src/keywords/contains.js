import { jsonValue } from "@hyperjump/browser/json";
import { siblingKeyword } from "./utilities.js";

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `contains`. The number of items that pass has to be between the sibling
 * `minContains` (default 1) and `maxContains` (default unlimited), which
 * have no effect on their own. The items that pass are evaluated.
 *
 * @type Keyword<{ handle: SchemaHandle; minContains: number; maxContains: number | null }>
 */
export default {
  uri: "https://json-schema.org/keyword/contains",
  shape: "schema",
  valueSchema: new URL("./contains.schema.json", import.meta.url).href,
  async compile(valueNode, context) {
    const minContainsNode = siblingKeyword(context.schemaNode, "https://json-schema.org/keyword/minContains");
    const maxContainsNode = siblingKeyword(context.schemaNode, "https://json-schema.org/keyword/maxContains");

    return {
      handle: await context.compileSchema(valueNode),
      minContains: minContainsNode?.jsonType === "number" ? /** @type number */ (jsonValue(minContainsNode)) : 1,
      maxContains: maxContainsNode?.jsonType === "number" ? /** @type number */ (jsonValue(maxContainsNode)) : null
    };
  },
  evaluate({ handle, minContains, maxContains }, { instance, schema, exhaustive, markEvaluated }) {
    const evaluate = schema(handle);
    const max = maxContains ?? Infinity;

    // Every item has to be evaluated to mark the ones that pass
    const canStopAtPass = !exhaustive && markEvaluated === undefined && max === Infinity;

    return (node) => {
      if (instance.typeOf(node) !== "array") {
        return true;
      }

      let matches = 0;
      let index = 0;
      for (const item of instance.items(node)) {
        if (evaluate(item, index)) {
          matches++;
          markEvaluated?.(index);

          if (canStopAtPass && matches >= minContains) {
            return true;
          } else if (!exhaustive && matches > max) {
            return false;
          }
        }
        index++;
      }

      return matches >= minContains && matches <= max;
    };
  }
};
