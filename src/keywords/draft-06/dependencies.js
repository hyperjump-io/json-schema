import { jsonValue } from "@hyperjump/browser/json";
import { isErrorNode, uniqueStrings } from "../checks.js";

/**
 * @import { Keyword, SchemaHandle } from "../../keyword.d.ts"
 */

/**
 * `dependencies` in draft-06 and draft-07. If the instance has the
 * property, an array is property names it has to have too, like
 * `dependentRequired`, and a schema applies to the whole instance, like
 * `dependentSchemas`. An array's names must be unique.
 *
 * @type Keyword<[string, SchemaHandle | string[]][]>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-06/dependencies",
  shape: { map: ["schema", { array: "data" }] },
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
  async compile(valueNode, context) {
    /** @type [string, SchemaHandle | string[]][] */
    const dependencies = [];
    if (valueNode.jsonType === "object") {
      for (const propertyNode of valueNode.children) {
        const [nameNode, dependencyNode] = propertyNode.children;
        dependencies.push([
          nameNode.value,
          dependencyNode.jsonType === "array"
            ? /** @type string[] */ (jsonValue(dependencyNode))
            : await context.compileSchema(dependencyNode)
        ]);
      }
    }

    return dependencies;
  },
  evaluate(compiled, { instance, schema, exhaustive }) {
    /** @type [string, string[] | ReturnType<typeof schema>][] */
    const dependencies = [];
    for (const [name, dependency] of compiled) {
      dependencies.push([name, Array.isArray(dependency) ? dependency : schema(dependency)]);
    }

    return (node) => {
      if (instance.typeOf(node) !== "object") {
        return true;
      }

      let valid = true;
      for (const [name, dependency] of dependencies) {
        if (!instance.has(node, name)) {
          continue;
        }

        const isValid = Array.isArray(dependency)
          ? dependency.every((requiredName) => instance.has(node, requiredName))
          : dependency(node);
        if (!isValid) {
          valid = false;
          if (!exhaustive) {
            return false;
          }
        }
      }

      return valid;
    };
  }
};
