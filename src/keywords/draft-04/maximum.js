import { jsonValue } from "@hyperjump/browser/json";
import { number } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `maximum` in draft-04. It's exclusive if the sibling `exclusiveMaximum`
 * is `true`.
 *
 * @type Keyword<{ maximum: number; exclusive: boolean }>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/maximum",
  siblings: { exclusiveMaximum: "https://json-schema.org/keyword/draft-04/exclusiveMaximum" },
  shape: "data",
  check: number,
  compile(valueNode, context) {
    const exclusiveNode = context.siblings.exclusiveMaximum;
    return {
      maximum: /** @type number */ (jsonValue(valueNode)),
      exclusive: exclusiveNode?.jsonType === "boolean" && exclusiveNode.value
    };
  },
  evaluate: ({ maximum, exclusive }, { instance }) => (node) => {
    if (instance.typeOf(node) !== "number") {
      return true;
    }

    const value = /** @type number */ (instance.value(node));
    return exclusive ? value < maximum : value <= maximum;
  }
};
