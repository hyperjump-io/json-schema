import { jsonValue, relativeFileUrl } from "@hyperjump/browser";
import { getFragment, getScheme, isIri, isIriReference, normalizeIri, resolveIri, toAbsoluteIri, toRelativeIri } from "@hyperjump/uri";
import { toId } from "../identifiers.js";
import { visitReferences } from "../lint/utilities.js";
import { getDialect, getDocument } from "../session.js";
import { isSchemaDocument } from "../schema/schema-nodes.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Dialect } from "../dialect.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { BundleOptions } from "../operations/bundle.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { NormalizedIri } from "@hyperjump/uri"
 * @import { Id } from "../identifiers.js"
 */

const definitionsUri = "https://json-schema.org/keyword/definitions";
const idUri = "https://json-schema.org/keyword/id";
const legacyIdUri = "https://json-schema.org/keyword/draft-07/id";
const notUri = "https://json-schema.org/keyword/not";

/**
 * See `bundle` in `src/operations/bundle.d.ts`. Everything that's retrieved
 * is retrieved first: the main document, the documents it references, and
 * their dialects. The bundle is made from them without retrieving anything.
 *
 * @type (session: JsonSchemaSession, uri: string, options?: BundleOptions) => Promise<Json>
 */
export const bundle = async (session, uri, options = {}) => {
  const externalSchemas = new Set(options.externalSchemas?.map((uri) => toId(uri)));

  const main = await schemaDocument(session, toId(uri));
  const documents = await referencedDocuments(session, main, externalSchemas);

  /** @type Map<string, Dialect> */
  const dialects = new Map();
  for (const document of [main, ...documents]) {
    const dialectUri = document.dialectUri;
    if (dialectUri !== undefined && !dialects.has(dialectUri)) {
      dialects.set(dialectUri, await getDialect(session, dialectUri));
    }
  }

  return bundleDocuments(main, documents, dialects, options);
};

/**
 * A bundle of the main document and the documents it references, with each
 * document's dialect
 *
 * @type (main: JsonSchemaDocumentNode, documents: JsonSchemaDocumentNode[], dialects: Map<string, Dialect>, options: BundleOptions) => Json
 */
const bundleDocuments = (main, documents, dialects, options) => {
  const { alwaysIncludeDialect = false, definitionNamingStrategy = "uri" } = options;
  const identifier = identifierFor(main, documents, options.id);
  /** @type (document: JsonSchemaDocumentNode) => Dialect */
  const dialectOf = (document) => /** @type Dialect */ (dialects.get(/** @type string */ (document.dialectUri)));

  const mainRoot = /** @type JsonSchemaNode */ (main.children[0]);
  if (mainRoot.type === "reference") {
    if (documents.length > 0) {
      throw Error(`Schemas can't be embedded in '${relativeFileUrl(main.uri)}', because its root is a '$ref' that replaces the whole object, so its definitions would be ignored`);
    }

    // Nothing else in it means anything, so it isn't given a dialect or an
    // identifier
    return jsonValue(mainRoot);
  } else if (mainRoot.jsonType === "boolean") {
    // A boolean schema has no references
    return mainRoot.value;
  }

  const mainDialect = dialectOf(main);
  const bundled = identify(/** @type Record<string, Json> */ (jsonValue(mainRoot)), mainDialect, identifier(main.uri), true);
  if (documents.length === 0) {
    return bundled;
  }

  const definitionsName = keywordName(mainDialect, definitionsUri);
  if (definitionsName === undefined) {
    throw Error(`Schemas can't be embedded in '${relativeFileUrl(main.uri)}', because its dialect, '${mainDialect.uri}', doesn't have definitions`);
  }

  const existing = /** @type Record<string, Json> | undefined */ (bundled[definitionsName]);

  /** @type Record<string, Json> */
  const definitions = { ...existing };
  for (const document of documents) {
    const id = /** @type string */ (identifier(document.uri));
    const includeDialect = alwaysIncludeDialect || document.dialectUri !== main.dialectUri;
    const embedded = embeddable(document, dialectOf(document), id, includeDialect);

    const name = definitionNamingStrategy === "uuid" ? crypto.randomUUID() : id;
    if (Object.hasOwn(definitions, name)) {
      throw Error(`'${relativeFileUrl(document.uri)}' can't be embedded in '${relativeFileUrl(main.uri)}', because its definitions already have '${name}'`);
    }
    definitions[name] = embedded;
  }
  bundled[definitionsName] = definitions;

  return bundled;
};

/**
 * What each document in a bundle is identified as. A schema can't be
 * identified by a `file:` URI, so a file without an identifier of its own
 * is identified by the `id` option: the main schema is that, and every
 * other file is where it is relative to the main schema, resolved against
 * it, so references between them find the same schemas. A main schema from
 * a file that embeds nothing isn't given one. Anything that isn't a file
 * keeps its URI.
 *
 * @type (main: JsonSchemaDocumentNode, documents: JsonSchemaDocumentNode[], id: string | undefined) => (uri: Id) => string | undefined
 */
const identifierFor = (main, documents, id) => {
  const isFile = (/** @type Id */ uri) => getScheme(uri) === "file";
  if (!isFile(main.uri)) {
    return (uri) => uri;
  }

  if (id === undefined) {
    const file = documents.find((document) => isFile(document.uri));
    if (file !== undefined) {
      throw Error(`'${relativeFileUrl(file.uri)}' can't be embedded without an identifier, because a schema can't be identified by a file. Give the bundle an identifier with the 'id' option, and the files are identified relative to it.`);
    }
    return (uri) => isFile(uri) ? undefined : uri;
  }

  if (!isIri(id)) {
    throw Error(`The bundle's 'id' has to be an absolute URI: '${id}'`);
  }
  const base = normalizeIri(toAbsoluteIri(id));
  if (isFile(base) || getFragment(id) !== undefined) {
    throw Error(`The bundle's 'id' has to be an absolute URI that isn't a file, without a fragment: '${id}'`);
  }

  return (uri) => isFile(uri) ? resolveIri(toRelativeIri(uri, main.uri) || base, base) : uri;
};

/**
 * `getDocument` only finds a document in a registry or retrieves it, so
 * this is always a whole document, never a resource embedded in one.
 *
 * @type (session: JsonSchemaSession, uri: Id) => Promise<JsonSchemaDocumentNode>
 */
const schemaDocument = async (session, uri) => {
  const document = await getDocument(session, uri);
  if (!isSchemaDocument(document)) {
    throw Error(`'${relativeFileUrl(uri)}' isn't a schema`);
  }

  return document;
};

/**
 * Every document the main document references, and the ones they
 * reference. A reference to a resource that's already in the bundle,
 * embedded or not, finds it there.
 *
 * @type (session: JsonSchemaSession, main: JsonSchemaDocumentNode, externalSchemas: Set<Id>) => Promise<JsonSchemaDocumentNode[]>
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
        throw Error(`'${relativeFileUrl(uri)}' is identified as '${document.uri}', so a reference to '${relativeFileUrl(uri)}' wouldn't find it in the bundle`);
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
 * @type (document: JsonSchemaDocumentNode) => NormalizedIri[]
 */
const references = (document) => {
  /** @type NormalizedIri[] */
  const uris = [];
  visitReferences(document, (uri) => {
    uris.push(uri);
  });

  return uris;
};

/**
 * A referenced document as a schema that can be embedded
 *
 * @type (document: JsonSchemaDocumentNode, dialect: Dialect, id: string, includeDialect: boolean) => Record<string, Json>
 */
const embeddable = (document, dialect, id, includeDialect) => {
  const root = /** @type JsonSchemaNode */ (document.children[0]);
  if (root.type === "reference") {
    throw Error(`'${relativeFileUrl(document.uri)}' can't be embedded, because its root is a '$ref' that replaces the whole object, so an identifier would be ignored`);
  }

  /** @type Record<string, Json> */
  let schema;
  if (root.jsonType === "boolean") {
    // Only an object can have an identifier
    const notName = keywordName(dialect, notUri);
    if (!root.value && notName === undefined) {
      throw Error(`'${relativeFileUrl(document.uri)}' can't be embedded, because it's 'false' and its dialect, '${dialect.uri}', doesn't have 'not'`);
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
    const fragment = typeof previous === "string" && isIriReference(previous) ? getFragment(previous) : undefined;
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
