import keywordSchema from "./conditional.schema.json" with { type: "json" };

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 * @import { JsonSchemaNode } from "../schema/schema-ast.d.ts"
 */

/**
 * `conditional`. It's a list of conditions, each followed by the schema that
 * applies if it passes. The first condition that passes decides. A schema
 * at the end without a condition applies if none pass. Conditions and their
 * schemas can be grouped in arrays, which are flattened.
 *
 * @type Keyword<SchemaHandle[]>
 */
export default {
  uri: "https://json-schema.org/keyword/conditional",
  shape: { array: ["schema", { array: "schema" }] },
  schema: keywordSchema,
  async compile(valueNode, context) {
    /** @type SchemaHandle[] */
    const handles = [];
    if (valueNode.jsonType !== "array") {
      return handles;
    }

    for (const itemNode of valueNode.children) {
      /** @type JsonSchemaNode[] */
      const schemaNodes = itemNode.jsonType === "array" ? itemNode.children : [itemNode];
      for (const schemaNode of schemaNodes) {
        handles.push(await context.compileSchema(schemaNode));
      }
    }

    return handles;
  },
  evaluate(conditional, { schema }) {
    const evaluators = conditional.map(schema);

    return (node) => {
      for (let index = 0; index < evaluators.length; index += 2) {
        const valid = evaluators[index](node);
        if (index + 1 === evaluators.length) {
          return valid;
        } else if (valid) {
          return evaluators[index + 1](node);
        }
      }

      return true;
    };
  }
};
