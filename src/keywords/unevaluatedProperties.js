import keywordSchema from "./unevaluatedProperties.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `unevaluatedProperties`. It applies to the properties that no other
 * keyword evaluated, including ones evaluated by subschemas that apply to
 * the same instance (`allOf`, `$ref`, …) and passed.
 *
 * @type Keyword<SchemaHandle>
 */
export default {
  uri: "https://json-schema.org/keyword/unevaluatedProperties",
  shape: "schema",
  schema: keywordSchema,
  compile: (valueNode, context) => context.compileSchema(valueNode),
  evaluate(handle, { instance, schema, exhaustive, markEvaluated, evaluated }) {
    const evaluate = schema(handle);
    const evaluatedSoFar = /** @type NonNullable<typeof evaluated> */ (evaluated);

    return (node) => {
      if (instance.typeOf(node) !== "object") {
        return true;
      }

      const alreadyEvaluated = evaluatedSoFar();
      let valid = true;
      for (const [name, property] of instance.entries(node)) {
        if (alreadyEvaluated.has(name)) {
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
  reads: ["evaluated"],
  simpleApplicator: true
};
