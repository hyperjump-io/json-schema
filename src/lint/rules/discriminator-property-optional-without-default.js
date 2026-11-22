import { documentForLint } from "../document.js";
import { lintRule } from "../lint-rule.js";
import { propertyAlternatives } from "../required-properties.js";
import { visitKeywords } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts"
 */

const discriminatorUri = "https://spec.openapis.org/oas/3.2/keyword/discriminator";

/**
 * A property is required if every way to pass the schema with the
 * `discriminator` has it (`propertyAlternatives`), so `required` next to it
 * counts, and so does every `oneOf` alternative requiring it
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void>
 */
const discriminatorPropertyOptionalWithoutDefault = lintRule({ origin: "json-schema-lint:discriminator-property-optional-without-default", url: "https://hyperjump.io/json-schema/linting/rules/discriminator-property-optional-without-default/" }, async (tree, file) => {
  const document = await documentForLint(tree, file);
  if (document === undefined) {
    return;
  }

  // The alternatives can be in other documents the references reach
  const schemas = new Map([...document.reached].map(([schemaNode, keywords]) => [schemaNode.location, keywords]));
  visitKeywords(tree, discriminatorUri, (keywordNode, schemaNode) => {
    const valueNode = keywordNode.children[1];
    if (valueNode.jsonType !== "object") {
      // The keyword's check reports it
      return;
    }

    const fields = new Map(valueNode.children.map((property) => [property.children[0].value, property.children[1]]));
    const propertyNameNode = fields.get("propertyName");
    if (fields.has("defaultMapping") || propertyNameNode?.jsonType !== "string") {
      return;
    }

    const keywords = document.schemas.get(schemaNode);
    if (keywords === undefined) {
      return;
    }

    // If nothing passes, other rules say so
    const alternatives = propertyAlternatives(schemaNode, keywords, schemas);
    const name = propertyNameNode.value;
    if (alternatives.length > 0 && !alternatives.every((alternative) => alternative.names.has(name))) {
      file.message(`'${name}' is optional, so '${keywordNode.children[0].value}' needs 'defaultMapping' for objects without it`, { place: keywordNode.position });
    }
  });
});

export default discriminatorPropertyOptionalWithoutDefault;
