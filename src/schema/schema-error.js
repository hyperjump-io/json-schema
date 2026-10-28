import { relativeFileUri } from "@hyperjump/browser";

/**
 * @import * as API from "./schema-error.d.ts"
 */

/** @implements API.SchemaError */
export class SchemaError extends Error {
  /**
   * @param {API.SchemaMessage[]} messages
   */
  constructor(messages) {
    const [first] = messages;
    const others = messages.length - 1;
    const more = others === 0 ? "" : ` (and ${others} more problem${others === 1 ? "" : "s"})`;
    super(`The schema at '${relativeFileUri(first.uri)}' is invalid: ${first.message}${more}`);
    this.name = this.constructor.name;
    this.messages = messages;
  }
}
