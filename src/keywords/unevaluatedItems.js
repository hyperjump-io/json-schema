/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `unevaluatedItems`. It applies to the items that no other keyword
 * evaluated, including ones evaluated by subschemas that apply to the same
 * instance (`allOf`, `$ref`, …) and passed.
 *
 * @type Keyword<SchemaHandle>
 */
export default {
  uri: "https://json-schema.org/keyword/unevaluatedItems",
  shape: "schema",
  compile: (valueNode, context) => context.compileSchema(valueNode),
  evaluate(handle, { instance, schema, exhaustive, markEvaluated, evaluated }) {
    const evaluate = schema(handle);
    const evaluatedSoFar = /** @type NonNullable<typeof evaluated> */ (evaluated);

    return (node) => {
      if (instance.typeOf(node) !== "array") {
        return true;
      }

      const alreadyEvaluated = evaluatedSoFar();
      let valid = true;
      let index = 0;
      for (const item of instance.items(node)) {
        if (!alreadyEvaluated.has(index)) {
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
  reads: ["evaluated"],
  simpleApplicator: true
};
