import { FileNotFoundError, HttpError, relativeFileUri, RetrievalError, RetrievalNotAllowedError } from "@hyperjump/browser";
import { JsonPointerError, pointerGet } from "@hyperjump/browser/json";
import { parseIri, toAbsoluteIri } from "@hyperjump/uri";
import { AnchorNotFoundError } from "../schema/media-type-plugin.js";
import { SchemaError } from "../schema/schema-error.js";

/**
 * @import { DocumentNode } from "@hyperjump/browser"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import * as API from "./find-schema.d.ts"
 */

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
    if (error instanceof RetrievalNotAllowedError || error instanceof SchemaError) {
      return { status: "unknown", reason: error };
    } else if (error instanceof RetrievalError) {
      const reason = absence(toAbsoluteIri(uri), error.cause);
      return reason ? { status: "missing", reason } : { status: "unknown", reason: error };
    }
    throw error;
  }

  if (document.type !== "json-schema-document") {
    return { status: "missing", reason: Error(`'${relativeFileUri(uri)}' isn't a schema. It's ${document.mediaType}.`) };
  }

  /** @type JsonSchemaNode */
  let node;
  try {
    const { fragment } = parseIri(uri);
    const pointer = fragment === undefined ? "" : session.jsonSchema.fragmentPointer(document, fragment);
    // The pointer's message says where it is with the document's URI
    node = pointerGet(pointer, /** @type JsonSchemaNode */ (document.children[0]), document.uri && relativeFileUri(document.uri));
  } catch (error) {
    if (error instanceof JsonPointerError || error instanceof AnchorNotFoundError) {
      return { status: "missing", reason: error };
    }
    throw error;
  }

  if (node.type !== "json-schema" && node.type !== "reference") {
    return { status: "missing", reason: Error(`'${relativeFileUri(uri)}' isn't a schema`) };
  }

  return { status: "found", node, document: /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (document)) };
};

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
