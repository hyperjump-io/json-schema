import { compileSchemaMap } from "./utilities.js";
import keywordSchema from "./patternProperties.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `patternProperties`. Patterns are ECMA-262 regular expressions with the
 * `u` flag. A property is evaluated against every pattern it matches.
 *
 * @type Keyword<[string, SchemaHandle][]>
 */
export default {
  uri: "https://json-schema.org/keyword/patternProperties",
  shape: { map: "schema" },
  schema: keywordSchema,
  compile: compileSchemaMap,
  evaluate(patternProperties, { instance, schema, alwaysPasses, exhaustive, markEvaluated }) {
    /** @type [RegExp, ReturnType<typeof schema>][] */
    const patterns = [];
    for (const [pattern, handle] of patternProperties) {
      if (!alwaysPasses(handle)) {
        patterns.push([new RegExp(pattern, "u"), schema(handle)]);
      }
    }

    if (patterns.length === 0) {
      return;
    }

    return (node) => {
      if (instance.typeOf(node) !== "object") {
        return true;
      }

      let valid = true;
      for (const [name, property] of instance.entries(node)) {
        for (const [pattern, evaluate] of patterns) {
          if (!pattern.test(name)) {
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
      }

      return valid;
    };
  },
  simpleApplicator: true
};
