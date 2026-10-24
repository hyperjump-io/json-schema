import { all, hasProperty, whenProperty } from "../utilities.js";
import { isErrorNode, uniqueStrings } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { Expression } from "../../kernel/kernel.d.ts"
 */

/**
 * `dependencies` in draft-06 and draft-07. If the instance has the
 * property, an array is property names it has to have too, like
 * `dependentRequired`, and a schema applies to the whole instance, like
 * `dependentSchemas`. An array's names must be unique.
 *
 * @type Keyword<[string, Expression | string[]][]>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-07/dependencies",
  shape: { map: ["schema", { array: "data" }] },
  default: {},
  check(valueNode, context) {
    if (valueNode.jsonType !== "object") {
      return;
    }

    for (const property of valueNode.children) {
      const dependencyNode = property.children[1];
      if (!isErrorNode(dependencyNode) && dependencyNode.jsonType === "array") {
        uniqueStrings(dependencyNode, context);
      }
    }
  },
  lower: (pairs) => all(pairs.map(([name, dependency]) => {
    return whenProperty(hasProperty(name), Array.isArray(dependency) ? all(dependency.map(hasProperty)) : dependency);
  }))
};
