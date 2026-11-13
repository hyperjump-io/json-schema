import { jsonValue, relativeFileUrl } from "@hyperjump/browser";
import { SchemaError } from "./schema-error.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema-ast.d.ts"
 * @import { SchemaMessage } from "./schema-error.d.ts"
 */

// What combines documents, like compiling and bundling, can only have one
// resource for a URI. It isn't part of the API.

/**
 * Resources are the same if they have the same dialect and the same JSON.
 * `$schema` isn't compared, because a bundle leaves it off a resource with
 * the same dialect as the one it's in. Only resources with the same URI are
 * compared, so references in them resolve the same way.
 *
 * @type (a: JsonSchemaDocumentNode, b: JsonSchemaDocumentNode) => boolean
 */
export const sameResource = (a, b) => a === b || (a.dialectUri === b.dialectUri && jsonEqual(resourceValue(a), resourceValue(b)));

/**
 * The problem of two documents with different resources for a URI, where
 * only one can be used. It's `document`'s problem, and it says the other
 * document.
 *
 * @type (resource: JsonSchemaDocumentNode, document: JsonSchemaDocumentNode, other: JsonSchemaDocumentNode) => SchemaError
 */
export const differentResources = (resource, document, other) => {
  /** @type SchemaMessage */
  const message = {
    source: "json-schema",
    ruleId: "duplicate-id",
    severity: "error",
    uri: document.uri,
    place: resource.children[0]?.position,
    message: `'${relativeFileUrl(other.uri)}' has a different schema resource identified as '${relativeFileUrl(resource.uri)}'`
  };
  if (document.origin !== undefined) {
    message.origin = document.origin;
  }
  return new SchemaError([message]);
};

/** @type (resource: JsonSchemaDocumentNode) => Json */
const resourceValue = (resource) => {
  const value = jsonValue(/** @type JsonSchemaNode */ (resource.children[0]));
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    delete value.$schema;
  }
  return value;
};

/** @type (a: Json, b: Json) => boolean */
const jsonEqual = (a, b) => {
  if (a === b) {
    return true;
  } else if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  } else if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => jsonEqual(item, b[index]));
  } else {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && jsonEqual(a[key], b[key]));
  }
};
