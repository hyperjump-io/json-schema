import { formatTypes } from "../format-types.js";
import { lintRule } from "../lint-rule.js";
import { keywordType, typeNames, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
 */

const plurals = {
  null: "null",
  boolean: "booleans",
  number: "numbers",
  string: "strings",
  array: "arrays",
  object: "objects"
};

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const keywordForDisallowedType = lintRule({ origin: "jsonschema-lint:keyword-for-disallowed-type" }, async (tree, file) => {
  /** @type JsonSchemaNode[] */
  const schemas = [];
  visitSchemas(tree, (schemaNode) => {
    schemas.push(schemaNode);
  });

  for (const schemaNode of schemas) {
    const type = typeNames(schemaNode);
    if (type === undefined || schemaNode.jsonType !== "object") {
      continue;
    }

    const allowed = new Set(type.names);
    if (allowed.has("integer")) {
      allowed.add("number");
    }

    const typeName = type.keywordNode.children[0].value;
    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const name = property.children[0].value;
      const appliesTo = keywordType(property.keywordUri);
      if (appliesTo !== undefined && !allowed.has(appliesTo)) {
        file.message(`'${name}' applies only to ${plurals[appliesTo]}, which '${typeName}' doesn't allow`, { place: property.position });
        continue;
      }

      // A format that could apply to any type isn't reported
      const types = await formatTypes(file.data.jsonSchemaSession, schemaNode, property);
      const formatNode = property.children[1];
      if (types !== undefined && formatNode.jsonType === "string" && !types.some((type) => allowed.has(type))) {
        const format = formatNode.value;
        const typeList = types.map((type) => plurals[type]).join(" or ");
        file.message(`The '${format}' format applies only to ${typeList}, which '${typeName}' doesn't allow`, { place: property.position });
      }
    }
  }
});

export default keywordForDisallowedType;
