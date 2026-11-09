import { FileNotFoundError, HttpError, JsonPointerError, jsonPointerGet, relativeFileUrl, RetrievalError } from "@hyperjump/browser";
import { getFragment, toAbsoluteIri } from "@hyperjump/uri";
import { AnchorNotFoundError } from "../schema/media-type-plugin.js";
import { SchemaError } from "../schema/schema-error.js";

/**
 * @import { DocumentNode } from "@hyperjump/browser"
 * @import { Iri } from "@hyperjump/uri"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import * as API from "./find-schema.d.ts"
 */

/** @type typeof API.findSchema */
export const findSchema = async (session, uri, options = {}) => {
  const { document: referencingDocument, ...getOptions } = options;

  // A resource in the document the reference is in is found in that
  // document, which a document that's linted rather than retrieved needs
  const embedded = referencingDocument?.embedded[toAbsoluteIri(uri)];
  let document = /** @type DocumentNode<JsonSchemaNode> | undefined */ (/** @type unknown */ (embedded));
  try {
    document ??= await session.getDocument(uri, getOptions);
  } catch (error) {
    if (error instanceof SchemaError || isRefusal(error)) {
      return { status: "unknown", reason: error };
    } else if (error instanceof RetrievalError) {
      const reason = absence(error.url, error.cause);
      return reason ? { status: "missing", reason } : { status: "unknown", reason: error };
    }
    throw error;
  }

  if (document.type !== "json-schema-document") {
    return { status: "missing", reason: Error(`'${relativeFileUrl(uri)}' isn't a schema. It's ${document.mediaType}.`) };
  }

  /** @type JsonSchemaNode */
  let node;
  try {
    const fragment = getFragment(uri);
    const pointer = fragment === undefined ? "" : session.jsonSchema.fragmentPointer(document, fragment);
    node = jsonPointerGet(pointer, /** @type JsonSchemaNode */ (document.children[0]));
  } catch (error) {
    if (error instanceof JsonPointerError || error instanceof AnchorNotFoundError) {
      return { status: "missing", reason: error };
    }
    throw error;
  }

  if (node.type !== "json-schema" && node.type !== "reference") {
    return { status: "missing", reason: Error(`'${relativeFileUrl(uri)}' isn't a schema`) };
  }

  return { status: "found", node, document: /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (document)) };
};

/**
 * A refusal, like one by `allowRetrieval`, is a 403. It doesn't say whether
 * there's anything there.
 *
 * @param {unknown} error
 * @returns {error is RetrievalError}
 */
const isRefusal = (error) => error instanceof RetrievalError && error.cause instanceof HttpError && error.cause.response.status === 403;

/**
 * Why there's nothing at a URI, if a retrieval failed because there's
 * nothing there, rather than because it couldn't be told
 *
 * @type (uri: string, error: unknown) => Error | undefined
 */
const absence = (uri, error) => {
  if (error instanceof FileNotFoundError) {
    return error;
  } else if (error instanceof HttpError && (error.response.status === 404 || error.response.status === 410)) {
    return Error(`There's nothing at '${uri}' (${error.response.status})`, { cause: error });
  }
};
