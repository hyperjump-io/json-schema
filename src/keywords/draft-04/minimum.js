import { jsonValue } from "@hyperjump/browser/json";
import { number } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `minimum` in draft-04. It's exclusive if the sibling `exclusiveMinimum`
 * is `true`.
 *
 * @type Keyword<{ minimum: number; exclusive: boolean }>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/minimum",
  siblings: { exclusiveMinimum: "https://json-schema.org/keyword/draft-04/exclusiveMinimum" },
  shape: "data",
  check: number,
  compile(valueNode, context) {
    const exclusiveNode = context.siblings.exclusiveMinimum;
    return {
      minimum: /** @type number */ (jsonValue(valueNode)),
      exclusive: exclusiveNode?.jsonType === "boolean" && exclusiveNode.value
    };
  },
  evaluate: ({ minimum, exclusive }, { instance }) => (node) => {
    if (instance.typeOf(node) !== "number") {
      return true;
    }

    const value = /** @type number */ (instance.value(node));
    return exclusive ? value > minimum : value >= minimum;
  }
};
