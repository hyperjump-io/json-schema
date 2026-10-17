/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `propertyNames`. Each property name is evaluated as a string instance.
 * It doesn't count as evaluating the properties.
 *
 * @type Keyword<SchemaHandle>
 */
export default {
  uri: "https://json-schema.org/keyword/propertyNames",
  shape: "schema",
  valueSchema: new URL("./propertyNames.schema.json", import.meta.url).href,
  compile: (valueNode, context) => context.compileSchema(valueNode),
  evaluate(handle, { instance, schema, exhaustive }) {
    const evaluate = schema(handle);

    return (node) => {
      if (instance.typeOf(node) !== "object") {
        return true;
      }

      let valid = true;
      for (const name of instance.keys(node)) {
        if (!evaluate(name)) {
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
