import type { NormalizedIri } from "@hyperjump/uri";
import type { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts";
import type { Hyperjump, Target } from "@hyperjump/browser";
import type { JsonSchemaConfig } from "../json-schema.d.ts";

/**
 * What a reference finds. A rule reports `missing`, and not `unknown`.
 *
 * - `found`: There's a schema there, in `document`. It may be a reference
 *   itself, which isn't followed.
 * - `missing`: There's no schema there. The file or HTTP resource doesn't
 *   exist (404 or 410), the document isn't a schema, the fragment doesn't
 *   point to anything, or it points to something that isn't a schema.
 * - `unknown`: Whether there's a schema there can't be told.
 *   `allowRetrieval` refused it, its URI scheme isn't supported, it
 *   couldn't be retrieved for another reason, or the document has problems
 *   that keep it from being used. Otherwise, every reference to a published
 *   schema would be reported.
 */
export type FindSchemaResult = {
  status: "found";
  node: JsonSchemaNode;
  document: JsonSchemaDocumentNode;
} | {
  status: "missing" | "unknown";
  /** Why, as an error that can be shown to the schema's author */
  reason: Error;
};

export type FindSchemaOptions = {
  /**
   * The document the reference is in, or a target in it, which it's
   * followed from. A resource in that document, including its root, is found there
   * before anything is retrieved, the way a reference finds an embedded
   * resource. It can be in the tree being linted, which wasn't retrieved,
   * so the session doesn't have it.
   */
  from?: Target | JsonSchemaDocumentNode;
};

/**
 * Find the schema an absolute URI identifies, the way a reference would.
 * It isn't part of the API: `documentForLint` finds every reference with it,
 * in the session the schema was resolved in (`file.data.jsonSchemaSession`),
 * so only what's in its registries and what `allowRetrieval` allows is
 * seen, and rules read what it found (`LintDocument.found`). Before
 * 2026-10-30, rules called it, which was the only way left for a rule to
 * retrieve something.
 *
 * A reference from the document being linted finds what's in it with the
 * `document` option. Anything else is found through the session, so a
 * reference back to the linted file from another document finds it the way
 * the session retrieves it.
 *
 * @throws Error that isn't about finding the schema, such as a bug in a
 * plugin.
 */
export const findSchema: (session: Hyperjump<JsonSchemaConfig>, uri: NormalizedIri, options?: FindSchemaOptions) => Promise<FindSchemaResult>;
