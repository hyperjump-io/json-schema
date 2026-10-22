import dependenciesKeyword from "../draft-07/dependencies.js";
import { isErrorNode, nonEmpty, uniqueStrings } from "../checks.js";

/**
 * @import { Keyword, SchemaHandle } from "../../keyword.d.ts"
 */

/**
 * `dependencies` in draft-04. It's the same as draft-07's, except that an
 * array can't be empty, as draft-04 says.
 *
 * @type Keyword<[string, SchemaHandle | string[]][]>
 */
export default {
  ...dependenciesKeyword,
  uri: "https://json-schema.org/keyword/draft-04/dependencies",
  check(valueNode, context) {
    if (valueNode.jsonType !== "object") {
      return;
    }

    for (const property of valueNode.children) {
      const dependencyNode = property.children[1];
      if (!isErrorNode(dependencyNode) && dependencyNode.jsonType === "array") {
        nonEmpty(dependencyNode, context);
        uniqueStrings(dependencyNode, context);
      }
    }
  }
};
