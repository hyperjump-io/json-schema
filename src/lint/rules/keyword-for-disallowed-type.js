import { lintRule } from "../lint-rule.js";
import { keywordType, typeNames, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

const keyword = "https://json-schema.org/keyword/";

const formatUris = new Set([keyword + "format", keyword + "draft-07/format"]);

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
  // A format is found by the URI its dialect maps its name to, so the
  // dialects are loaded first. Without a session, formats aren't known.
  const session = file.data.jsonSchemaSession;
  const jsonSchema = session?.jsonSchema;
  /** @type Map<string, Record<string, string>> */
  const dialectFormats = new Map();
  if (session !== undefined) {
    /** @type Set<string> */
    const dialectUris = new Set();
    visitSchemas(tree, (schemaNode) => {
      if (schemaNode.type === "json-schema") {
        dialectUris.add(schemaNode.dialectUri);
      }
    });

    for (const dialectUri of dialectUris) {
      try {
        dialectFormats.set(dialectUri, (await session.getDialect(dialectUri)).formats ?? {});
      } catch {
        // Already reported when the schema was resolved
      }
    }
  }

  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.jsonType !== "object") {
      return;
    }

    const type = typeNames(schemaNode);
    if (type === undefined) {
      return;
    }

    const allowed = new Set(type.names);
    if (allowed.has("integer")) {
      allowed.add("number");
    }

    const typeName = type.keywordNode.children[0].value;
    const formats = schemaNode.type === "json-schema" ? dialectFormats.get(schemaNode.dialectUri) : undefined;
    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const name = property.children[0].value;
      const valueNode = property.children[1];
      if (formatUris.has(property.keywordUri)) {
        if (formats === undefined || valueNode.jsonType !== "string" || !Object.hasOwn(formats, valueNode.value)) {
          continue;
        }

        // A format whose definition hasn't been added, or that doesn't say
        // which types it applies to, could apply to any type
        const formatUri = formats[valueNode.value];
        const types = jsonSchema?.hasFormat(formatUri) ? jsonSchema.getFormat(formatUri).types : undefined;
        if (types !== undefined && !types.some((type) => allowed.has(type))) {
          const typeList = types.map((type) => plurals[type]).join(" or ");
          file.message(`The '${valueNode.value}' format applies only to ${typeList}, which '${typeName}' doesn't allow`, { place: property.position });
        }
      } else {
        const appliesTo = keywordType(property.keywordUri);
        if (appliesTo !== undefined && !allowed.has(appliesTo)) {
          file.message(`'${name}' applies only to ${plurals[appliesTo]}, which '${typeName}' doesn't allow`, { place: property.position });
        }
      }
    }
  });
});

export default keywordForDisallowedType;
