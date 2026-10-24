/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `additionalProperties`. It applies to the properties that aren't in the
 * sibling `properties` and don't match the sibling `patternProperties`.
 *
 * @type Keyword<{ handle: SchemaHandle; properties: string[]; patterns: string[] }>
 */
export default {
  uri: "https://json-schema.org/keyword/additionalProperties",
  siblings: { properties: "https://json-schema.org/keyword/properties", patternProperties: "https://json-schema.org/keyword/patternProperties" },
  shape: "schema",
  default: true,
  async compile(valueNode, context) {
    /** @type string[] */
    const properties = [];
    const propertiesNode = context.siblings.properties;
    if (propertiesNode?.jsonType === "object") {
      for (const propertyNode of propertiesNode.children) {
        properties.push(propertyNode.children[0].value);
      }
    }

    /** @type string[] */
    const patterns = [];
    const patternPropertiesNode = context.siblings.patternProperties;
    if (patternPropertiesNode?.jsonType === "object") {
      for (const propertyNode of patternPropertiesNode.children) {
        patterns.push(propertyNode.children[0].value);
      }
    }

    return { handle: await context.compileSchema(valueNode), properties, patterns };
  },
  evaluate({ handle, properties, patterns }, { instance, schema, alwaysPasses, exhaustive, markEvaluated }) {
    if (alwaysPasses(handle)) {
      return;
    }

    const evaluate = schema(handle);
    const defined = new Set(properties);

    /** @type RegExp[] */
    const regExps = [];
    for (const pattern of patterns) {
      regExps.push(new RegExp(pattern, "u"));
    }

    /** @type (name: string) => boolean */
    const isAdditional = (name) => {
      if (defined.has(name)) {
        return false;
      }

      for (const regExp of regExps) {
        if (regExp.test(name)) {
          return false;
        }
      }

      return true;
    };

    return (node) => {
      if (instance.typeOf(node) !== "object") {
        return true;
      }

      let valid = true;
      for (const [name, property] of instance.entries(node)) {
        if (!isAdditional(name)) {
          continue;
        }

        if (evaluate(property, name)) {
          markEvaluated?.(name);
        } else {
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
