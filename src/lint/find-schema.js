import { referencedSchema } from "../schema/referenced-schema.js";
import { SchemaError } from "../schema/schema-error.js";

/**
 * @import * as API from "./find-schema.d.ts"
 */

/** @type typeof API.findSchema */
export const findSchema = async (session, uri, options = {}) => {
  try {
    // A resource in the document the reference is in is found in that
    // document, which a document that's linted rather than retrieved needs
    return { status: "found", ...await referencedSchema(session, uri, options.document?.embedded) };
  } catch (error) {
    if (error instanceof SchemaError) {
      return { status: "unknown", reason: error };
    }

    const code = codeOf(error);
    if (code === undefined) {
      throw error;
    }
    return { status: isMissing(error) ? "missing" : "unknown", reason: /** @type Error */ (error) };
  }
};

/**
 * Why something failed, to code: its `cause.code`, which every failure to
 * retrieve or read a document has. An error without one isn't about
 * finding the schema.
 *
 * @type (error: unknown) => string | undefined
 */
const codeOf = (error) => {
  const cause = error instanceof Error ? /** @type {{ code?: unknown } | undefined} */ (error.cause) : undefined;
  return typeof cause?.code === "string" ? cause.code : undefined;
};

/**
 * Whether it failed because there's no schema there, rather than because
 * it couldn't be told: a file that doesn't exist, a 404 or 410, a document
 * or a value that isn't a schema, or a fragment that doesn't identify
 * anything. Anything else, like a refusal by `allowRetrieval`, doesn't say
 * whether there's anything there.
 *
 * @type (error: unknown) => boolean
 */
const isMissing = (error) => {
  const { code, status } = /** @type {{ code: string, status?: number }} */ (/** @type Error */ (error).cause);
  return code === "ENOENT" || code === "ENOTDIR" || (code === "ERR_HTTP_STATUS" && (status === 404 || status === 410))
    || code === "ERR_NOT_A_SCHEMA" || code === "ERR_ANCHOR_NOT_FOUND" || code.startsWith("ERR_POINTER_");
};
