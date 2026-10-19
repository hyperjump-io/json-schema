import { jsonValue } from "@hyperjump/browser/json";
import { anchorName } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$dynamicRef` in v1. Its value is the name of a dynamic anchor, and the
 * outermost schema in the dynamic scope with that anchor applies to the
 * instance.
 *
 * @type Keyword<string>
 */
export default {
  uri: "https://json-schema.org/keyword/dynamicRef",
  shape: "data",
  check: anchorName,
  compile: (valueNode) => /** @type string */ (jsonValue(valueNode)),
  evaluate(name, context) {
    const dynamicAnchor = /** @type NonNullable<typeof context.dynamicAnchor> */ (context.dynamicAnchor);

    return (node) => {
      const evaluate = dynamicAnchor(name);
      if (evaluate === undefined) {
        throw Error(`No '${name}' dynamic anchor is in the dynamic scope`);
      }

      return evaluate(node);
    };
  },
  reads: ["dynamicScope"],
  simpleApplicator: true
};
