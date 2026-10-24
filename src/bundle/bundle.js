import { jsonValue } from "@hyperjump/browser/json";
import { parseIri, resolveIri, toAbsoluteIri, toRelativeIri } from "@hyperjump/uri";
import { visitReferences } from "../lint/utilities.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Dialect } from "../dialect.d.ts"
 * @import { BundleOptions, JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 */

const definitionsUri = "https://json-schema.org/keyword/definitions";
const idUri = "https://json-schema.org/keyword/id";
const legacyIdUri = "https://json-schema.org/keyword/draft-07/id";
const notUri = "https://json-schema.org/keyword/not";

/**
 * See `JsonSchemaSession.bundle`
 *
 * @type (session: JsonSchemaSession, uri: string, options?: BundleOptions) => Promise<Json>
 */
export const bundle = async (session, uri, options = {}) => {
  const { alwaysIncludeDialect = false, definitionNamingStrategy = "uri" } = options;
  const externalSchemas = new Set(options.externalSchemas?.map((uri) => toAbsoluteIri(uri)));

  const main = await schemaDocument(session, toAbsoluteIri(uri));
  const documents = await referencedDocuments(session, main, externalSchemas);

  const mainRoot = /** @type JsonSchemaNode */ (main.children[0]);
  if (mainRoot.type === "reference") {
    if (documents.length > 0) {
      throw Error(`Schemas can't be embedded in '${main.uri}', because its root is a '$ref' that replaces the whole object, so its definitions would be ignored`);
    }

    // Nothing else in it means anything, so it isn't given a dialect or an
    // identifier
    return jsonValue(mainRoot);
  } else if (mainRoot.jsonType === "boolean") {
    // A boolean schema has no references
    return mainRoot.value;
  }

  // A file's bundle can be moved with the files it came from
  const isFile = parseIri(main.uri).scheme === "file";
  const mainDialect = await session.getDialect(/** @type string */ (main.dialectUri));
  const bundled = identify(/** @type Record<string, Json> */ (jsonValue(mainRoot)), mainDialect, isFile ? undefined : main.uri, true);
  if (documents.length === 0) {
    return bundled;
  }

  const definitionsName = keywordName(mainDialect, definitionsUri);
  if (definitionsName === undefined) {
    throw Error(`Schemas can't be embedded in '${main.uri}', because its dialect, '${mainDialect.uri}', doesn't have definitions`);
  }

  const existing = /** @type Record<string, Json> | undefined */ (bundled[definitionsName]);

  /** @type Record<string, Json> */
  const definitions = { ...existing };
  for (const document of documents) {
    const id = isFile ? toRelativeIri(main.uri, document.uri) : document.uri;
    const includeDialect = alwaysIncludeDialect || document.dialectUri !== main.dialectUri;
    const embedded = await embeddable(session, document, id, includeDialect);

    const name = definitionNamingStrategy === "uuid" ? crypto.randomUUID() : id;
    if (Object.hasOwn(definitions, name)) {
      throw Error(`'${document.uri}' can't be embedded in '${main.uri}', because its definitions already have '${name}'`);
    }
    definitions[name] = embedded;
  }
  bundled[definitionsName] = definitions;

  return bundled;
};

/**
 * Only a registry or retrieval finds a document without `referencedFrom`, so
 * this is always a whole document, never a resource embedded in one.
 *
 * @type (session: JsonSchemaSession, uri: string) => Promise<JsonSchemaDocumentNode>
 */
const schemaDocument = async (session, uri) => {
  const document = await session.getDocument(uri);
  if (document.type !== "json-schema-document") {
    throw Error(`'${uri}' isn't a schema`);
  }

  return /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (document));
};

/**
 * Every document the main document references, and the ones they
 * reference. A reference to a resource that's already in the bundle,
 * embedded or not, finds it there.
 *
 * @type (session: JsonSchemaSession, main: JsonSchemaDocumentNode, externalSchemas: Set<string>) => Promise<JsonSchemaDocumentNode[]>
 */
const referencedDocuments = async (session, main, externalSchemas) => {
  const resources = new Set(Object.keys(main.embedded));
  const documents = [main];
  for (let index = 0; index < documents.length; index++) {
    for (const reference of references(documents[index])) {
      const uri = toAbsoluteIri(reference);
      if (resources.has(uri) || externalSchemas.has(uri)) {
        continue;
      }

      const document = await schemaDocument(session, uri);
      if (document.uri !== uri) {
        // Embedded, it's only found by its identifier
        throw Error(`'${uri}' is identified as '${document.uri}', so a reference to '${uri}' wouldn't find it in the bundle`);
      }

      for (const resourceUri in document.embedded) {
        resources.add(resourceUri);
      }
      documents.push(document);
    }
  }

  return documents.slice(1);
};

/**
 * The URIs a document references. v1's `$dynamicRef` is a name, so it never
 * references another document.
 *
 * @type (document: JsonSchemaDocumentNode) => string[]
 */
const references = (document) => {
  /** @type string[] */
  const uris = [];
  visitReferences(document, (uri) => {
    uris.push(uri);
  });

  return uris;
};

/**
 * A referenced document as a schema that can be embedded
 *
 * @type (session: JsonSchemaSession, document: JsonSchemaDocumentNode, id: string, includeDialect: boolean) => Promise<Record<string, Json>>
 */
const embeddable = async (session, document, id, includeDialect) => {
  const root = /** @type JsonSchemaNode */ (document.children[0]);
  if (root.type === "reference") {
    throw Error(`'${document.uri}' can't be embedded, because its root is a '$ref' that replaces the whole object, so an identifier would be ignored`);
  }

  const dialect = await session.getDialect(/** @type string */ (document.dialectUri));

  /** @type Record<string, Json> */
  let schema;
  if (root.jsonType === "boolean") {
    // Only an object can have an identifier
    const notName = keywordName(dialect, notUri);
    if (!root.value && notName === undefined) {
      throw Error(`'${document.uri}' can't be embedded, because it's 'false' and its dialect, '${dialect.uri}', doesn't have 'not'`);
    }
    schema = root.value ? {} : { [/** @type string */ (notName)]: {} };
  } else {
    schema = /** @type Record<string, Json> */ (jsonValue(root));
  }

  return identify(schema, dialect, id, includeDialect);
};

/**
 * Add `$schema` and an identifier to the root of a schema, first, the way
 * they're usually written. An identifier that's already there is replaced,
 * because a relative one would be resolved against the bundle instead of
 * where the schema came from. A plain-name fragment in it (draft-04 through
 * draft-07) is kept, because it's an anchor.
 *
 * @type (schema: Record<string, Json>, dialect: Dialect, id: string | undefined, includeDialect: boolean) => Record<string, Json>
 */
const identify = (schema, dialect, id, includeDialect) => {
  const { $schema, ...keywords } = schema;

  /** @type Record<string, Json> */
  const identified = {};
  if (typeof $schema === "string") {
    identified.$schema = $schema;
  } else if (includeDialect) {
    // draft-04 through draft-07 meta-schemas are conventionally written with
    // an empty fragment
    identified.$schema = keywordName(dialect, legacyIdUri) === undefined ? dialect.uri : `${dialect.uri}#`;
  }

  if (id !== undefined) {
    const idName = keywordName(dialect, idUri) ?? keywordName(dialect, legacyIdUri);
    if (idName === undefined) {
      throw Error(`A schema in the '${dialect.uri}' dialect can't be identified, because the dialect doesn't have '$id'`);
    }

    const previous = keywords[idName];
    delete keywords[idName];
    const fragment = typeof previous === "string" ? parseIri(resolveIri(previous, id)).fragment : undefined;
    identified[idName] = fragment ? `${id}#${fragment}` : id;
  }

  return { ...identified, ...keywords };
};

/** @type (dialect: Dialect, keywordUri: string) => string | undefined */
const keywordName = (dialect, keywordUri) => {
  for (const name in dialect.keywords) {
    if (dialect.keywords[name] === keywordUri) {
      return name;
    }
  }
};
