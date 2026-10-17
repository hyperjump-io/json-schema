import { compileSchemaArray } from "./utilities.js";

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `oneOf`
 *
 * @type Keyword<SchemaHandle[]>
 */
export default {
  uri: "https://json-schema.org/keyword/oneOf",
  shape: { array: "schema" },
  valueSchema: new URL("./oneOf.schema.json", import.meta.url).href,
  compile: compileSchemaArray,
  evaluate(oneOf, { schema, exhaustive }) {
    const evaluators = oneOf.map(schema);

    return (node) => {
      let matches = 0;
      for (const evaluate of evaluators) {
        if (evaluate(node)) {
          matches++;
          if (!exhaustive && matches > 1) {
            return false;
          }
        }
      }

      return matches === 1;
    };
  }
};
