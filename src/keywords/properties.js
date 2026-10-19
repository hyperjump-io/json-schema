import { compileSchemaMap } from "./utilities.js";

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `properties`
 *
 * @type Keyword<[string, SchemaHandle][]>
 */
export default {
  uri: "https://json-schema.org/keyword/properties",
  shape: { map: "schema" },
  compile: compileSchemaMap,
  evaluate(properties, { instance, schema, alwaysPasses, exhaustive, markEvaluated }) {
    const evaluators = new Map();
    for (const [name, handle] of properties) {
      if (!alwaysPasses(handle)) {
        evaluators.set(name, schema(handle));
      }
    }

    if (evaluators.size === 0) {
      return;
    }

    return (node) => {
      if (instance.typeOf(node) !== "object") {
        return true;
      }

      let valid = true;
      for (const [name, property] of instance.entries(node)) {
        const evaluate = evaluators.get(name);
        if (evaluate === undefined) {
          continue;
        }

        if (evaluate(property, name)) {
          markEvaluated?.(name);
        } else {
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
