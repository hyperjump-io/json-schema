import type { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema-ast.d.ts";

/**
 * Whether a node is a schema. A reference can lead to any document a
 * session can read, so what `get` and the `jref*` functions find might not
 * be one, and a session whose type doesn't say its media types finds
 * `unknown`.
 */
export const isSchemaNode: (node: unknown) => node is JsonSchemaNode & { type: "json-schema" };

/**
 * Whether a node is a schema that's a reference: a `$ref` in a dialect
 * where it replaces the whole object, like draft-04 through draft-07. A
 * reference that's a keyword's value, like `$ref` since 2019-09, isn't a
 * schema. It isn't part of the API.
 */
export const isReferenceSchema: (node: unknown) => node is JsonSchemaNode & { type: "reference"; jsonType: "object" };

/**
 * Whether a document is a schema document. `get` finds any document
 * a session can read, like a JSON file.
 */
export const isSchemaDocument: (document: unknown) => document is JsonSchemaDocumentNode;
