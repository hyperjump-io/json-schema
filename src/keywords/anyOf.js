import { compileSchemaArray } from "./utilities.js";
import { nonEmpty } from "./checks.js";

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `anyOf`
 *
 * @type Keyword<SchemaHandle[]>
 */
export default {
  uri: "https://json-schema.org/keyword/anyOf",
  shape: { array: "schema" },
  check: nonEmpty,
  compile: compileSchemaArray,
  evaluate(anyOf, { schema, alwaysPasses, exhaustive, markEvaluated }) {
    // One subschema that always passes is enough
    if (anyOf.some(alwaysPasses)) {
      return;
    }

    const evaluators = anyOf.map(schema);

    // Every subschema has to be evaluated to mark what the passing ones
    // evaluate
    const canStopAtPass = !exhaustive && markEvaluated === undefined;

    return (node) => {
      let valid = false;
      for (const evaluate of evaluators) {
        if (evaluate(node)) {
          valid = true;
          if (canStopAtPass) {
            return true;
          }
        }
      }

      return valid;
    };
  }
};
