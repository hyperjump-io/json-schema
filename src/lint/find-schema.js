import { HttpError, RetrievalError } from "@hyperjump/browser";
import { JsonPointerError, pointerGet } from "@hyperjump/browser/json";
import { parseIri, toAbsoluteIri } from "@hyperjump/uri";
import { RetrievalNotAllowedError } from "../retrieval/retrieval-not-allowed-error.js";
import { AnchorNotFoundError } from "../schema/media-type-plugin.js";

/**
 * @import { DocumentNode } from "@hyperjump/browser"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import * as API from "./find-schema.d.ts"
 */

/**
 * Whether a retrieval failed because there's nothing there, rather than
 * because it couldn't be told
 *
 * @type (error: unknown) => boolean
 */
const isAbsent = (error) => {
  const code = /** @type {{ code?: unknown }} */ (error).code;
  if (code === "ENOENT" || code === "ENOTDIR") {
    return true;
  }

  return error instanceof HttpError && (error.response.status === 404 || error.response.status === 410);
};

/** @type API.findSchema */
export const findSchema = async (session, uri, options = {}) => {
  const { document: referencingDocument, ...getOptions } = options;

  // A resource in the document the reference is in is found in that
  // document, which a document that's linted rather than retrieved needs
  const embedded = referencingDocument?.embedded[toAbsoluteIri(uri)];
  let document = /** @type DocumentNode<JsonSchemaNode> | undefined */ (/** @type unknown */ (embedded));
  try {
    document ??= await session.getDocument(uri, getOptions);
  } catch (error) {
    if (error instanceof RetrievalNotAllowedError) {
      return { status: "unknown", reason: error };
    } else if (error instanceof RetrievalError) {
      return { status: isAbsent(error.cause) ? "missing" : "unknown", reason: error };
    }
    throw error;
  }

  if (document.type !== "json-schema-document") {
    return { status: "missing", reason: Error(`'${uri}' isn't a schema. It's ${document.mediaType}.`) };
  }

  /** @type JsonSchemaNode */
  let node;
  try {
    const { fragment } = parseIri(uri);
    const pointer = fragment === undefined ? "" : session.jsonSchema.fragmentPointer(document, fragment);
    node = pointerGet(pointer, /** @type JsonSchemaNode */ (document.children[0]), document.uri);
  } catch (error) {
    if (error instanceof JsonPointerError || error instanceof AnchorNotFoundError) {
      return { status: "missing", reason: error };
    }
    throw error;
  }

  if (node.type !== "json-schema" && node.type !== "reference") {
    return { status: "missing", reason: Error(`'${uri}' isn't a schema`) };
  }

  return { status: "found", node };
};
