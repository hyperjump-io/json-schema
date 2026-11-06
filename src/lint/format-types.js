/**
 * @import { JsonType } from "@hyperjump/browser"
 * @import * as API from "./format-types.d.ts"
 */

const formatUris = new Set(["https://json-schema.org/keyword/format", "https://json-schema.org/keyword/draft-07/format"]);

/** @type typeof API.formatTypes */
export const formatTypes = (document, schemaNode, keywordNode) => {
  const valueNode = keywordNode.children[1];
  if (schemaNode.type !== "json-schema" || !formatUris.has(keywordNode.keywordUri) || valueNode.jsonType !== "string") {
    return;
  }

  // A dialect that can't be found was reported when the schema was resolved
  const formats = document.dialects.get(schemaNode.dialectUri)?.formats;
  if (formats === undefined || !Object.hasOwn(formats, valueNode.value)) {
    return;
  }

  return /** @type JsonType[] | undefined */ (document.definitions.formats[formats[valueNode.value]]?.types);
};
