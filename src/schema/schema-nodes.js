/**
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema-ast.d.ts"
 */

// The functions are declared in `schema-nodes.d.ts`.

/**
 * @param {unknown} node
 * @returns {node is JsonSchemaNode & { type: "json-schema" }}
 */
export const isSchemaNode = (node) => hasType(node, "json-schema");

/**
 * Whether a node is a schema that's a reference, like a `$ref` in draft-04
 * through draft-07, which is an object. A reference that's a keyword's
 * value, like `$ref` since 2019-09, is a string.
 *
 * @param {unknown} node
 * @returns {node is JsonSchemaNode & { type: "reference", jsonType: "object" }}
 */
export const isReferenceSchema = (node) => hasType(node, "reference") && /** @type {{ jsonType?: string }} */ (node).jsonType === "object";

/**
 * @param {unknown} document
 * @returns {document is JsonSchemaDocumentNode}
 */
export const isSchemaDocument = (document) => hasType(document, "json-schema-document");

/** @type (value: unknown, type: string) => boolean */
const hasType = (value, type) => typeof value === "object" && value !== null && "type" in value && value.type === type;
