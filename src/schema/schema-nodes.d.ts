import type { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema-ast.d.ts";

/**
 * Whether a node is a schema. A reference can lead to any document a
 * session can read, so what `get` and the `jref*` functions find might not
 * be one, and a session whose type doesn't say its media types finds
 * `unknown`.
 */
export const isSchemaNode: (node: unknown) => node is JsonSchemaNode & { type: "json-schema" };

/**
 * Whether a document is a schema document. `get` finds any document
 * a session can read, like a JSON file.
 */
export const isSchemaDocument: (document: unknown) => document is JsonSchemaDocumentNode;
