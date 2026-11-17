import { jrefFindAll, jsonValue, relativeFileUrl } from "@hyperjump/browser";
import { getFragment, getScheme, isIri, isIriReference, normalizeIri, resolveIri, toAbsoluteIri, toRelativeIri } from "@hyperjump/uri";
import { toId } from "../identifiers.js";
import { browse, getDialect } from "../session.js";
import { isSchemaDocument } from "../schema/schema-nodes.js";
import { differentResources, sameResource } from "../schema/same-resource.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Dialect } from "../dialect.d.ts"
 * @import { BundleOptions } from "../operations/bundle.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { NormalizedIri } from "@hyperjump/uri"
 * @import { Id } from "../identifiers.js"
 * @import { Hyperjump, Target } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
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
 * @type (session: Hyperjump<JsonSchemaConfig>, uri: string, options?: BundleOptions) => Promise<Json>
 */
export const bundle = async (session, uri, options = {}) => {
  const externalSchemas = new Set(options.externalSchemas?.map((uri) => toId(uri)));

  const mainTarget = await schemaTarget(session, toId(uri));
  const main = mainTarget.document;
  const documents = await referencedDocuments(session, mainTarget, externalSchemas);

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
 * A schema document
 *
 * @typedef {Target<JsonSchemaDocumentNode, JsonSchemaNode>} DocumentTarget
 */

/**
 * The root of the document at a URI, as it's written, as a target. With
 * `referencedFrom`, the reference that led to it, the document it's in is
 * what caused it to be retrieved.
 *
 * @type (session: Hyperjump<JsonSchemaConfig>, uri: Id, referencedFrom?: Target) => Promise<DocumentTarget>
 */
const schemaTarget = async (session, uri, referencedFrom) => {
  const target = /** @type Target */ (await browse(session, uri, { referencedFrom, reference: "manual" }));
  if (!isSchemaDocument(target.document)) {
    throw Error(`'${relativeFileUrl(uri)}' isn't a schema`);
  }

  return /** @type DocumentTarget */ (target);
};

/**
 * Every document the main document references, and the ones they
 * reference. A reference to a resource that's already in the bundle,
 * embedded or not, finds it there, so it isn't followed. That's looked
 * for in every document that's been gathered, not only the one the
 * reference is in, because a bundle is one document.
 *
 * A document's references are found by browsing it as it's written, which
 * gives each one as a target. v1's `$dynamicRef` is a name, so it never
 * references another document.
 *
 * @type (session: Hyperjump<JsonSchemaConfig>, main: DocumentTarget, externalSchemas: Set<Id>) => Promise<JsonSchemaDocumentNode[]>
 */
const referencedDocuments = async (session, main, externalSchemas) => {
  /** @type Map<string, [resource: JsonSchemaDocumentNode, document: JsonSchemaDocumentNode]> */
  const resources = new Map();
  addResources(resources, main.document);
  const documents = [main];
  for (let index = 0; index < documents.length; index++) {
    const references = /** @type Target[] */ (await jrefFindAll(session, /** @type any */ (documents[index]), "reference", { reference: "manual", maxDepth: Infinity }));
    for (const reference of references) {
      const uri = toAbsoluteIri(/** @type {{ href: NormalizedIri }} */ (reference.node).href);
      if (resources.has(uri) || externalSchemas.has(uri)) {
        continue;
      }

      const found = await schemaTarget(session, uri, reference);
      if (found.document.uri !== uri) {
        // Embedded, it's only found by its identifier
        throw Error(`'${relativeFileUrl(uri)}' is identified as '${found.document.uri}', so a reference to '${relativeFileUrl(uri)}' wouldn't find it in the bundle`);
      }

      addResources(resources, found.document);
      documents.push(found);
    }
  }

  return documents.slice(1).map(({ document }) => document);
};

/**
 * Add a document's resources to the bundle's. A bundle is one document, so
 * it can only have one resource for a URI. A resource another document has
 * too has to be identical.
 *
 * @type (resources: Map<string, [resource: JsonSchemaDocumentNode, document: JsonSchemaDocumentNode]>, document: JsonSchemaDocumentNode) => void
 * @throws SchemaError if a document already in the bundle has a different
 * resource with the same URI.
 */
const addResources = (resources, document) => {
  for (const uri in document.embedded) {
    const resource = document.embedded[uri];
    const bundled = resources.get(uri);
    if (bundled === undefined) {
      resources.set(uri, [resource, document]);
    } else if (!sameResource(bundled[0], resource)) {
      throw differentResources(resource, document, bundled[1]);
    }
  }
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
