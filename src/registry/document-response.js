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
 * The session's `fetch` answers with it, and browser gives the plugin the
 * response the session's `fetch` returned, so the plugin gets this one.
 */
export class DocumentResponse extends Response {
  /** @type JsonSchemaDocumentNode */
  document;

  /** @param {JsonSchemaDocumentNode} document */
  constructor(document) {
    super(null, { headers: { "content-type": "application/schema+json" } });
    this.document = document;
    Object.defineProperty(this, "url", { value: document.url, configurable: true });
  }
}
