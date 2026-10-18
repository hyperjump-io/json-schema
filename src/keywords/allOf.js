import { compileSchemaArray } from "./utilities.js";
import keywordSchema from "./allOf.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `allOf`
 *
 * @type Keyword<SchemaHandle[]>
 */
export default {
  uri: "https://json-schema.org/keyword/allOf",
  shape: { array: "schema" },
  schema: keywordSchema,
  compile: compileSchemaArray,
  evaluate(allOf, { schema, alwaysPasses, exhaustive }) {
    const evaluators = allOf.filter((handle) => !alwaysPasses(handle)).map(schema);
    if (evaluators.length === 0) {
      return;
    }

    return (node) => {
      let valid = true;
      for (const evaluate of evaluators) {
        if (!evaluate(node)) {
          valid = false;
          if (!exhaustive) {
            return false;
          }
        }
      }

      return valid;
    };
  },
  simpleApplicator: true
};
