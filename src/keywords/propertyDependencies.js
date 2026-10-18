import { compileSchemaMap } from "./utilities.js";
import keywordSchema from "./propertyDependencies.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `propertyDependencies`. If the instance has the property and its value is
 * a string with a schema, the schema applies to the whole instance.
 *
 * @type Keyword<[string, [string, SchemaHandle][]][]>
 */
export default {
  uri: "https://json-schema.org/keyword/propertyDependencies",
  shape: { map: { map: "schema" } },
  schema: keywordSchema,
  async compile(valueNode, context) {
    /** @type [string, [string, SchemaHandle][]][] */
    const dependencies = [];
    if (valueNode.jsonType === "object") {
      for (const propertyNode of valueNode.children) {
        const [nameNode, mappingsNode] = propertyNode.children;
        dependencies.push([nameNode.value, await compileSchemaMap(mappingsNode, context)]);
      }
    }

    return dependencies;
  },
  evaluate(propertyDependencies, { instance, schema, exhaustive }) {
    /** @type [string, Map<string, ReturnType<typeof schema>>][] */
    const dependencies = [];
    for (const [name, mappings] of propertyDependencies) {
      const evaluators = new Map();
      for (const [value, handle] of mappings) {
        evaluators.set(value, schema(handle));
      }
      dependencies.push([name, evaluators]);
    }

    return (node) => {
      if (instance.typeOf(node) !== "object") {
        return true;
      }

      let valid = true;
      for (const [name, evaluators] of dependencies) {
        const property = instance.get(node, name);
        if (property === undefined || instance.typeOf(property) !== "string") {
          continue;
        }

        const evaluate = evaluators.get(/** @type string */ (instance.value(property)));
        if (evaluate !== undefined && !evaluate(node)) {
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
