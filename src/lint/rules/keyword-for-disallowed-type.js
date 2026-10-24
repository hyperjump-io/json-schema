import { keywordAppliesTo } from "../analysis.js";
import { formatTypes } from "../format-types.js";
import { lintRule } from "../lint-rule.js";
import { lowerForLint } from "../lower.js";
import { typeNames, visitSchemas } from "../utilities.js";

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
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }

  const lowered = await lowerForLint(session, tree);

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
    const keywords = lowered.get(schemaNode) ?? [];
    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      // A format that could apply to any type isn't reported
      const types = await formatTypes(session, schemaNode, keywordNode);
      const formatNode = keywordNode.children[1];
      if (types !== undefined && formatNode.jsonType === "string") {
        if (!types.some((type) => allowed.has(type))) {
          const format = formatNode.value;
          const typeList = types.map((type) => plurals[type]).join(" or ");
          file.message(`The '${format}' format applies only to ${typeList}, which '${typeName}' doesn't allow`, { place: keywordNode.position });
        }
        continue;
      }

      // A keyword with no effect applies to nothing, which other rules report
      const applies = keywordAppliesTo(session.jsonSchema, keywords, keywordNode);
      if (applies.length > 0 && !applies.some((type) => allowed.has(type))) {
        const name = keywordNode.children[0].value;
        const typeList = applies.map((type) => plurals[type]).join(" or ");
        file.message(`'${name}' applies only to ${typeList}, which '${typeName}' doesn't allow`, { place: keywordNode.position });
      }
    }
  }
});

export default keywordForDisallowedType;
