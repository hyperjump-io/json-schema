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
 * @throws What `get` throws.
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
