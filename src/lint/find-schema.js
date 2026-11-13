import { jsonPointerGet, relativeFileUrl } from "@hyperjump/browser";
import { getFragment, toAbsoluteIri } from "@hyperjump/uri";
import { schemaMediaType } from "../schema/media-type-plugin.js";
import { SchemaError } from "../schema/schema-error.js";
import { documentOf, get } from "../session.js";
import { isSchemaDocument } from "../schema/schema-nodes.js";

/**
 * @import { DocumentNode } from "@hyperjump/browser"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaMediaTypeDocument } from "../schema/media-type-plugin.d.ts"
 * @import * as API from "./find-schema.d.ts"
 */

/** @type typeof API.findSchema */
export const findSchema = async (session, uri, options = {}) => {
  // A resource in the document the reference is in is found in that
  // document, which a document that's linted rather than retrieved needs
  const embedded = options.document?.embedded[toAbsoluteIri(uri)];
  /** @type unknown */
  let document = embedded;
  try {
    // Any document the session can read
    document ??= await documentOf(session, await get(session, toAbsoluteIri(uri), { follow: false }));
  } catch (error) {
    if (error instanceof SchemaError) {
      return { status: "unknown", reason: error };
    }

    const code = codeOf(error);
    if (code === undefined) {
      throw error;
    }
    return { status: isAbsence(error) ? "missing" : "unknown", reason: /** @type Error */ (error) };
  }

  if (!isSchemaDocument(document)) {
    return { status: "missing", reason: Error(`'${relativeFileUrl(uri)}' isn't a schema`) };
  }

  /** @type JsonSchemaNode */
  let node;
  try {
    const fragment = getFragment(uri);
    const pointer = fragment === undefined ? "" : schemaMediaType.fragmentPointer(/** @type JsonSchemaMediaTypeDocument */ (document), fragment);
    node = jsonPointerGet(pointer, /** @type JsonSchemaNode */ (document.children[0]));
  } catch (error) {
    const code = codeOf(error);
    if (code === "ERR_ANCHOR_NOT_FOUND" || code?.startsWith("ERR_POINTER_")) {
      return { status: "missing", reason: /** @type Error */ (error) };
    }
    throw error;
  }

  if (node.type !== "json-schema" && node.type !== "reference") {
    return { status: "missing", reason: Error(`'${relativeFileUrl(uri)}' isn't a schema`) };
  }

  return { status: "found", node, document };
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
 * Whether a retrieval failed because there's nothing there, rather than
 * because it couldn't be told: a file that doesn't exist, or a 404 or 410.
 * Anything else, like a refusal by `allowRetrieval`, doesn't say whether
 * there's anything there.
 *
 * @type (error: unknown) => boolean
 */
const isAbsence = (error) => {
  const { code, status } = /** @type {{ code: string, status?: number }} */ (/** @type Error */ (error).cause);
  return code === "ENOENT" || code === "ENOTDIR" || (code === "ERR_HTTP_STATUS" && (status === 404 || status === 410));
};
