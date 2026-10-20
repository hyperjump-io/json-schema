/**
 * @import * as API from "./retrieval-not-allowed-error.d.ts"
 */

/** @implements API.RetrievalNotAllowedError */
export class RetrievalNotAllowedError extends Error {
  /**
   * @param {string} uri
   * @param {string} [message]
   */
  constructor(uri, message = `Retrieving '${uri}' isn't allowed. Use the 'allowRetrieval' config to allow it.`) {
    super(message);
    this.name = this.constructor.name;
    this.uri = uri;
  }
}
