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
 * @param {unknown} document
 * @returns {document is JsonSchemaDocumentNode}
 */
export const isSchemaDocument = (document) => hasType(document, "json-schema-document");

/** @type (value: unknown, type: string) => boolean */
const hasType = (value, type) => typeof value === "object" && value !== null && "type" in value && value.type === type;
