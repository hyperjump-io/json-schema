import type { Iri } from "@hyperjump/uri";
import type { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema-ast.d.ts";
import type { Hyperjump } from "@hyperjump/browser";
import type { JsonSchemaConfig } from "../json-schema.d.ts";

/**
 * The schema a reference finds, and the resource it's in. `embedded` is the
 * `embedded` of the document the reference is in, where a resource is found
 * before anything is retrieved, so what's found there has the same
 * `embedded`. Anything else is a document from a registry or retrieval,
 * with its own.
 *
 * The schema can be a reference itself, which isn't followed. It's what
 * linting uses, which reports on references as they're written, and finds
 * them in a tree the session might not have. It isn't part of the API.
 *
 * @throws What `getDocument` throws.
 * @throws An `Error` whose `cause.code` is `ERR_NOT_A_SCHEMA` if the
 * document isn't a schema, or what the fragment identifies isn't one.
 * @throws What a fragment that doesn't identify anything throws, whose
 * `cause.code` is `ERR_ANCHOR_NOT_FOUND` or starts with `ERR_POINTER_`.
 */
export const referencedSchema: (
  session: Hyperjump<JsonSchemaConfig>,
  uri: Iri,
  embedded?: Record<string, JsonSchemaDocumentNode>
) => Promise<{ document: JsonSchemaDocumentNode; node: JsonSchemaNode }>;

/**
 * The schema a reference finds, followed, and the resource it's in. It's
 * browser's `get` with `from` as `referencedFrom`, so a resource the
 * document `from` is in embeds is found before anything is retrieved, and
 * a schema that's a reference is followed, through any document, to a
 * value. `from` is a node of a document the session has. Without it, the
 * URI is found the way any URI is. It's what compiling uses. It isn't part
 * of the API.
 *
 * @throws What `get` and `getDocument` throw, like an `Error` whose
 * `cause.code` is `ERR_REFERENCE_CYCLE`.
 * @throws An `Error` whose `cause.code` is `ERR_NOT_A_SCHEMA` if what the
 * references lead to isn't a schema.
 */
export const followedSchema: (
  session: Hyperjump<JsonSchemaConfig>,
  uri: Iri,
  from?: JsonSchemaNode
) => Promise<{ document: JsonSchemaDocumentNode; node: JsonSchemaNode & { type: "json-schema" } }>;
