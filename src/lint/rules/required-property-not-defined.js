import { lintRule } from "../lint-rule.js";
import { isNegated, schemaGroup } from "../schema-group.js";
import { findKeyword, propertySchemas, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

const keyword = "https://json-schema.org/keyword";

/** Keywords that define properties. An `unevaluatedProperties` defines every one. */
const definingUris = ["properties", "patternProperties", "additionalProperties", "unevaluatedProperties"]
  .map((name) => `${keyword}/${name}`);

/**
 * @typedef {{ schemaNode: JsonSchemaNode; requiredNode: JsonSchemaKeywordNode }} Required
 */

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const requiredPropertyNotDefined = lintRule({ origin: "json-schema-lint:required-property-not-defined", url: "https://hyperjump.io/json-schema/linting/rules/required-property-not-defined/" }, async (tree, file) => {
  /** @type Required[] */
  const requireds = [];
  visitSchemas(tree, (schemaNode) => {
    for (const requiredUri of [`${keyword}/required`, `${keyword}/draft-04/required`]) {
      const requiredNode = findKeyword(schemaNode, requiredUri);
      if (requiredNode?.children[1].jsonType === "array") {
        requireds.push({ schemaNode, requiredNode });
      }
    }
  });

  for (const { schemaNode, requiredNode } of requireds) {
    const group = await schemaGroup(file.data.jsonSchemaSession, tree, schemaNode);

    // A schema in `not` requires that a property isn't there
    if (group.unknown || isNegated(group, schemaNode)) {
      continue;
    }

    // A schema that's a reference (draft-04 through draft-07) ignores what's
    // next to it, so it doesn't define anything
    const defining = group.schemas.filter((member) => member.type === "json-schema");

    // A group that defines no properties, and could be applied from another
    // document, is likely meant to be combined with one that does
    const definesAny = defining.some((member) => definingUris.some((uri) => findKeyword(member, uri) !== undefined));
    if (group.open && !definesAny) {
      continue;
    }

    const requiredValue = /** @type JsonSchemaNode & { jsonType: "array" } */ (requiredNode.children[1]);
    for (const itemNode of requiredValue.children) {
      if (itemNode.jsonType !== "string") {
        continue;
      }

      const name = itemNode.value;
      const defined = defining.some((member) => {
        const schemas = propertySchemas(member, name);
        return schemas === undefined || schemas.length > 0 || findKeyword(member, `${keyword}/unevaluatedProperties`) !== undefined;
      });
      if (!defined) {
        file.message(`'${name}' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed`, { place: itemNode.position });
      }
    }
  }
});

export default requiredPropertyNotDefined;
