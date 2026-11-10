/**
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 */

/**
 * A registry's answer to a request: a response that has the schema document
 * it's for, already resolved. A registry entry is resolved once for every
 * session that can share it, so the schema media type plugin gives the
 * session this document instead of resolving the entry again. It has the
 * entry's `origin`, which a response can't say.
 *
 * The registry's layer is on top of the session's stack, so nothing between
 * it and the plugin makes a new response that wouldn't have the document.
 */
export class DocumentResponse extends Response {
  /** @type JsonSchemaDocumentNode */
  document;

  /** @param {JsonSchemaDocumentNode} document */
  constructor(document) {
    super(null, { headers: { "content-type": "application/schema+json" } });
    this.document = document;
    Object.defineProperty(this, "url", { value: document.url });
  }
}
