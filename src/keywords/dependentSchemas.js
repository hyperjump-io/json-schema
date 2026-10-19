import { compileSchemaMap } from "./utilities.js";

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `dependentSchemas`. Each schema applies to the whole instance if it has
 * the property.
 *
 * @type Keyword<[string, SchemaHandle][]>
 */
export default {
  uri: "https://json-schema.org/keyword/dependentSchemas",
  shape: { map: "schema" },
  compile: compileSchemaMap,
  evaluate(dependentSchemas, { instance, schema, exhaustive }) {
    /** @type [string, ReturnType<typeof schema>][] */
    const dependencies = [];
    for (const [name, handle] of dependentSchemas) {
      dependencies.push([name, schema(handle)]);
    }

    return (node) => {
      if (instance.typeOf(node) !== "object") {
        return true;
      }

      let valid = true;
      for (const [name, evaluate] of dependencies) {
        if (instance.has(node, name) && !evaluate(node)) {
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
