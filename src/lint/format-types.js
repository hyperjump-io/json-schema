/**
 * @import { JsonType } from "@hyperjump/browser/json"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import * as API from "./format-types.d.ts"
 */

const formatUris = new Set(["https://json-schema.org/keyword/format", "https://json-schema.org/keyword/draft-07/format"]);

/**
 * Each dialect's format names, by session, because sessions can build
 * different dialects for the same URI
 *
 * @type WeakMap<JsonSchemaSession, Map<string, Promise<Record<string, string> | undefined>>>
 */
const dialectFormats = new WeakMap();

/** @type (session: JsonSchemaSession, dialectUri: string) => Promise<Record<string, string> | undefined> */
const formatsOf = (session, dialectUri) => {
  let byDialect = dialectFormats.get(session);
  if (byDialect === undefined) {
    byDialect = new Map();
    dialectFormats.set(session, byDialect);
  }

  let formats = byDialect.get(dialectUri);
  if (formats === undefined) {
    formats = session.getDialect(dialectUri).then(
      (dialect) => dialect.formats ?? {},
      // Already reported when the schema was resolved
      () => undefined
    );
    byDialect.set(dialectUri, formats);
  }

  return formats;
};

/** @type API.formatTypes */
export const formatTypes = async (session, schemaNode, keywordNode) => {
  const valueNode = keywordNode.children[1];
  if (session === undefined || schemaNode.type !== "json-schema" || !formatUris.has(keywordNode.keywordUri) || valueNode.jsonType !== "string") {
    return;
  }

  const formats = await formatsOf(session, schemaNode.dialectUri);
  if (formats === undefined || !Object.hasOwn(formats, valueNode.value)) {
    return;
  }

  const uri = formats[valueNode.value];
  return session.jsonSchema.hasFormat(uri) ? /** @type JsonType[] | undefined */ (session.jsonSchema.getFormat(uri).types) : undefined;
};
