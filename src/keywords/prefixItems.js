import { compileSchemaArray } from "./utilities.js";
import keywordSchema from "./prefixItems.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `prefixItems`. Each schema applies to the item at the same index.
 *
 * @type Keyword<SchemaHandle[]>
 */
export default {
  uri: "https://json-schema.org/keyword/prefixItems",
  shape: { array: "schema" },
  schema: keywordSchema,
  compile: compileSchemaArray,
  evaluate(prefixItems, { instance, schema, exhaustive, markEvaluated }) {
    const evaluators = prefixItems.map(schema);

    return (node) => {
      if (instance.typeOf(node) !== "array") {
        return true;
      }

      let valid = true;
      let index = 0;
      for (const item of instance.items(node)) {
        if (index >= evaluators.length) {
          break;
        }

        if (evaluators[index](item, index)) {
          markEvaluated?.(index);
        } else {
          valid = false;
          if (!exhaustive) {
            return false;
          }
        }
        index++;
      }

      return valid;
    };
  },
  simpleApplicator: true
};
