import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { propertyAlternatives } from "../required-properties.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

/**
 * 3.0's and 3.1's `discriminator` and 3.2's, and whether `defaultMapping`
 * makes an optional property fine. 3.0.4 and 3.1.1 say the property SHOULD
 * be required. 3.2 says it MAY be optional, but then the Discriminator
 * Object MUST have `defaultMapping`.
 *
 * @type [string, boolean][]
 */
const discriminators = [
  ["https://spec.openapis.org/oas/3.1/keyword/discriminator", false],
  ["https://spec.openapis.org/oas/3.2/keyword/discriminator", true]
];

/**
 * A property is required if every way to pass the schema with the
 * `discriminator` has it (`propertyAlternatives`), so `required` next to it
 * counts, and so does every `oneOf` alternative requiring it. The presets
 * give it its severity for each version.
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const discriminatorPropertyOptional = lintRule({ origin: "json-schema-lint:discriminator-property-optional", url: "https://hyperjump.io/json-schema/linting/rules/discriminator-property-optional/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  // The alternatives can be in other documents the references reach
  const schemas = new Map([...document.reached].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));
  for (const [uri, hasDefault] of discriminators) {
    visitKeywords(tree, uri, (keywordNode, schemaNode) => {
      const valueNode = keywordNode.children[1];
      if (valueNode.jsonType !== "object") {
        // The keyword's check reports it
        return;
      }

      const fields = new Map(valueNode.children.map((property) => [property.children[0].value, property.children[1]]));
      const propertyNameNode = fields.get("propertyName");
      if ((hasDefault && fields.has("defaultMapping")) || propertyNameNode?.jsonType !== "string") {
        return;
      }

      const keywords = document.schemas.get(schemaNode);
      if (keywords === undefined) {
        return;
      }

      // If nothing passes, other rules say so
      const alternatives = propertyAlternatives(schemaNode, keywords, schemas);
      const name = propertyNameNode.value;
      if (alternatives.length === 0 || alternatives.every((alternative) => alternative.names.has(name))) {
        return;
      }

      const keywordName = keywordNode.children[0].value;
      file.message(hasDefault
        ? `'${name}' is optional, so '${keywordName}' needs 'defaultMapping' for objects without it`
        : `'${name}' is optional, and what '${keywordName}' does without it is undefined. Make it required.`, { place: keywordNode.position });
    });
  }
});

export default discriminatorPropertyOptional;
