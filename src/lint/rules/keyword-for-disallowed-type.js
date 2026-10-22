import { lintRule } from "../lint-rule.js";
import { visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 */

const keyword = "https://json-schema.org/keyword/";

/**
 * The instance type each keyword applies to, in every dialect. Keywords that
 * apply to any type, like `enum`, aren't here. `format` depends on the
 * format, which says which types it applies to.
 *
 * @type Map<string, "number" | "string" | "array" | "object">
 */
const keywordTypes = new Map([
  ...[
    "multipleOf", "maximum", "minimum", "exclusiveMaximum", "exclusiveMinimum",
    "draft-04/maximum", "draft-04/minimum", "draft-04/exclusiveMaximum", "draft-04/exclusiveMinimum"
  ].map((name) => /** @type const */ ([keyword + name, "number"])),
  ...[
    "maxLength", "minLength", "pattern", "contentEncoding", "contentMediaType", "contentSchema"
  ].map((name) => /** @type const */ ([keyword + name, "string"])),
  ...[
    "items", "prefixItems", "unevaluatedItems", "contains", "maxContains", "minContains",
    "maxItems", "minItems", "uniqueItems", "itemPattern",
    "draft-2019-09/items", "draft-2019-09/additionalItems"
  ].map((name) => /** @type const */ ([keyword + name, "array"])),
  ...[
    "properties", "patternProperties", "additionalProperties", "unevaluatedProperties", "propertyNames",
    "maxProperties", "minProperties", "required", "dependentRequired", "dependentSchemas",
    "propertyDependencies", "requireAllExcept",
    "draft-04/required", "draft-04/dependencies", "draft-07/dependencies"
  ].map((name) => /** @type const */ ([keyword + name, "object"]))
]);

const typeUris = new Set([keyword + "type", keyword + "draft-2020-12/type"]);

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

    const keywords = /** @type JsonSchemaKeywordNode[] */ (schemaNode.children);
    const typeNode = keywords.find((property) => typeUris.has(property.keywordUri));
    if (typeNode === undefined) {
      return;
    }

    // Only a type that's a string or a non-empty array of strings. An empty
    // array is reported by empty-type.
    const typeValue = typeNode.children[1];
    const typeItems = typeValue.jsonType === "array" ? typeValue.children : [typeValue];
    if (typeItems.length === 0) {
      return;
    }

    /** @type Set<string> */
    const allowed = new Set();
    for (const itemNode of typeItems) {
      if (itemNode.jsonType !== "string") {
        return;
      }
      allowed.add(itemNode.value);
    }
    if (allowed.has("integer")) {
      allowed.add("number");
    }

    const typeName = typeNode.children[0].value;
    const formats = schemaNode.type === "json-schema" ? dialectFormats.get(schemaNode.dialectUri) : undefined;
    for (const property of keywords) {
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
        const keywordType = keywordTypes.get(property.keywordUri);
        if (keywordType !== undefined && !allowed.has(keywordType)) {
          file.message(`'${name}' applies only to ${plurals[keywordType]}, which '${typeName}' doesn't allow`, { place: property.position });
        }
      }
    }
  });
});

export default keywordForDisallowedType;
