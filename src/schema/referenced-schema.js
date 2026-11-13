import { jsonPointerGet, relativeFileUrl } from "@hyperjump/browser";
import { getFragment, toAbsoluteIri } from "@hyperjump/uri";
import { getDocument } from "../session.js";
import { schemaMediaType } from "./media-type-plugin.js";
import { isSchemaDocument } from "./schema-nodes.js";

/**
 * @import { JsonSchemaNode } from "./schema-ast.d.ts"
 * @import { JsonSchemaMediaTypeDocument } from "./media-type-plugin.d.ts"
 * @import * as API from "./referenced-schema.d.ts"
 */

/** @type typeof API.referencedSchema */
export const referencedSchema = async (session, uri, embedded) => {
  const id = toAbsoluteIri(uri);
  /** @type unknown */
  const document = embedded?.[id] ?? await getDocument(session, id);
  if (!isSchemaDocument(document)) {
    throw notASchema(uri);
  }

  const fragment = getFragment(uri);
  const pointer = fragment === undefined ? "" : schemaMediaType.fragmentPointer(/** @type JsonSchemaMediaTypeDocument */ (document), fragment);
  const node = jsonPointerGet(pointer, /** @type JsonSchemaNode */ (document.children[0]));
  if (node.type !== "json-schema" && node.type !== "reference") {
    throw notASchema(uri);
  }

  return { document, node };
};

/** @type (uri: string) => Error */
const notASchema = (uri) => Error(`'${relativeFileUrl(uri)}' isn't a schema`, { cause: { code: "ERR_NOT_A_SCHEMA" } });
