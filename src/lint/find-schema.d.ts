import type { GetOptions } from "@hyperjump/browser";
import type { JsonSchemaSession } from "../session.d.ts";
import type { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts";

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

export type FindSchemaOptions = GetOptions & {
  /**
   * The document the reference is in. A resource in it, including its root,
   * is found in it before the session is used, the way a reference finds an
   * embedded resource. Pass the tree a rule is given, because a document
   * that's linted wasn't retrieved, so the session doesn't have it.
   */
  document?: JsonSchemaDocumentNode;
};

/**
 * Find the schema an absolute URI identifies, the way a reference would.
 * Use the session the schema was resolved in (`file.data.jsonSchemaSession`),
 * so only what's in its registries and what `allowRetrieval` allows is
 * seen. Rules never create sessions.
 *
 * A reference from the document being linted finds what's in it with the
 * `document` option. Anything else is found through the session, so a
 * reference back to the linted file from another document finds it the way
 * the session retrieves it.
 *
 * @throws Error that isn't about finding the schema, such as a bug in a
 * plugin.
 */
export const findSchema: (session: JsonSchemaSession, uri: string, options?: FindSchemaOptions) => Promise<FindSchemaResult>;
