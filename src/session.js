import { documentOf, get, Hyperjump, jsonPointerGet, relativeFileUrl } from "@hyperjump/browser";
import { encodeIriFragment, urlToIri } from "@hyperjump/uri";
import { toId } from "./identifiers.js";
import { SessionRegistries } from "./registry/session-registries.js";
import { DocumentResponse } from "./registry/document-response.js";
import { isSchemaDocument } from "./schema/schema-nodes.js";
import { withValidateFormats } from "./dialects/extend-dialect.js";
import unknownKeyword, { keywordDefinitionUri } from "./keywords/unknown.js";

/**
 * @import { Dialect } from "./dialect.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema/schema-ast.d.ts"
 * @import { Id } from "./identifiers.js"
 * @import * as API from "./session.d.ts"
 */

// Not imported from the v1 dialect, which would load all of its keywords
const v1DialectUri = "https://json-schema.org/v1";

/**
 * What a session keeps for schemas, in its state
 *
 * - `embedded` maps the URI of every resource in a schema document to the
 *   `embedded` objects that have it, so a node's resource is found from its
 *   location.
 * - `documents` has the documents in `embedded` by their `embedded` objects.
 * - `dialects` are the dialects built from meta-schemas in this session.
 * - `pendingDialects` are the dialects whose meta-schemas are being
 *   retrieved.
 * - `loading` maps the dialects whose meta-schemas are being retrieved to
 *   the dialects their meta-schemas are waiting on.
 *
 * @typedef {{
 *   registries: SessionRegistries,
 *   embedded: Map<Id, Record<string, JsonSchemaDocumentNode>[]>,
 *   documents: WeakMap<Record<string, JsonSchemaDocumentNode>, JsonSchemaDocumentNode>,
 *   dialects: Record<string, Dialect>,
 *   pendingDialects: Record<string, Promise<Dialect>>,
 *   loading: Map<Id, Set<Id>>
 * }} Schemas
 */

/** The key of a session's schemas in its state */
const schemasKey = {};

/** @type (session: API.JsonSchemaSession) => Schemas */
const schemasOf = (session) => session.state(schemasKey, () => {
  throw Error("A schema can only be retrieved in a session of a JsonSchema. Use its 'session' function to create one.");
});

/** @type typeof API.createSession */
export const createSession = (jsonSchema, options = {}) => {
  const allowRetrieval = options.allowRetrieval ?? jsonSchema.config.allowRetrieval;
  const hyperjump = new Hyperjump({
    ...jsonSchema.config,
    stack: jsonSchema.stack,
    ...allowRetrieval === undefined ? {} : { allowRetrieval }
  });

  /** @type API.JsonSchemaSession<any, any> */
  const session = Object.freeze({
    hyperjump,
    jsonSchema,
    config: hyperjump.config,
    contextUrl: hyperjump.contextUrl,
    state: (key, init) => hyperjump.state(key, init),

    // A registry's schema isn't retrieved, so it's found before the
    // `Hyperjump` is asked, and `allowRetrieval` doesn't apply to it. A
    // registry is keyed by IRI, so the URL is converted where it comes in.
    fetch: async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input, hyperjump.contextUrl);
      const { registries } = schemasOf(session);
      const registryDocument = registries.get(toId(urlToIri(url)));
      if (registryDocument) {
        return new DocumentResponse(await registryDocument);
      }

      // A failure might be explained by a schema in a registry that can't
      // be identified yet
      let response;
      let failure;
      try {
        response = await hyperjump.fetch(input, init);
        if (response.ok) {
          return response;
        }
        failure = Error(`'${relativeFileUrl(url.href)}' can't be used, because its response's status is ${response.status}`, { cause: { code: "ERR_HTTP_STATUS", status: response.status } });
      } catch (error) {
        failure = error;
      }

      const reasons = registries.missReasons();
      if (reasons.length === 0) {
        if (response) {
          return response;
        }
        throw failure;
      }

      await response?.body?.cancel();
      throw new AggregateError([failure, ...reasons], reasons[0].message);
    }
  });

  hyperjump.state(schemasKey, () => /** @type Schemas */ ({
    registries: new SessionRegistries(session, options.registry),
    embedded: new Map(),
    documents: new WeakMap(),
    dialects: {},
    pendingDialects: {},
    loading: new Map()
  }));

  return session;
};

/**
 * @param {object} context
 * @returns {context is API.JsonSchemaSession}
 */
export const isSession = (context) => "hyperjump" in context;

/** @type typeof API.registriesOf */
export const registriesOf = (session) => schemasOf(session).registries;

export { documentOf, get };

/**
 * A session can have documents with different resources for a URI, like a
 * schema and a document that embeds another schema with its `$id`. Browsing
 * doesn't combine documents, so that's only a problem for what does, like
 * compiling, which checks it.
 *
 * @type typeof API.addResources
 */
export const addResources = (session, document) => {
  const { embedded: index, documents } = schemasOf(session);
  const embedded = document.embedded;
  if (documents.has(embedded)) {
    return;
  }

  for (const uri of new Set([document.uri, ...Object.values(embedded).map((resource) => resource.uri)])) {
    const containing = index.get(uri);
    if (containing) {
      containing.push(embedded);
    } else {
      index.set(uri, [embedded]);
    }
  }
  documents.set(embedded, document);
};

/**
 * A resource's nodes have locations that start with its URI. More than one
 * document can have a resource with that URI, so the node's is the one
 * where the location's pointer leads to that node.
 *
 * @type typeof API.resourceOf
 */
export const resourceOf = (session, node) => {
  const position = node.location.indexOf("#");
  const uri = toId(node.location);
  const pointer = position === -1 ? "" : decodeURIComponent(node.location.slice(position + 1));
  for (const embedded of schemasOf(session).embedded.get(uri) ?? []) {
    const resource = embedded[uri];
    try {
      if (resource !== undefined && jsonPointerGet(pointer, /** @type JsonSchemaNode */ (resource.children[0])) === node) {
        return resource;
      }
    } catch {
      // The location isn't in this document
    }
  }
};

/** @type typeof API.containerOf */
export const containerOf = (session, resource) => schemasOf(session).documents.get(resource.embedded);

/** @type typeof API.hasDialect */
export const hasDialect = (session, uri) => dialectOf(session, toId(uri)) !== undefined;

/** @type (session: API.JsonSchemaSession, uri: Id) => Dialect | undefined */
const dialectOf = (session, uri) => session.jsonSchema.hasDialect(uri) ? session.jsonSchema.getDialect(uri) : schemasOf(session).dialects[uri];

/** @type typeof API.getDialect */
export const getDialect = async (session, dialectUri, options = {}) => {
  const uri = toId(dialectUri);

  const dialect = dialectOf(session, uri);
  if (dialect) {
    return dialect;
  }

  if (options.referencedFrom !== undefined) {
    waitOn(session, toId(options.referencedFrom), uri);
  }

  const { pendingDialects } = schemasOf(session);
  pendingDialects[uri] ??= loadDialect(session, uri).finally(() => {
    delete pendingDialects[uri];
  });

  return pendingDialects[uri];
};

/**
 * If the reference is from a meta-schema that's being retrieved to build a
 * dialect, that dialect is waiting on the one it asked for. If that one is
 * waiting on this one, neither will ever finish.
 *
 * @type (session: API.JsonSchemaSession, referencedFrom: Id, uri: Id) => void
 */
const waitOn = (session, referencedFrom, uri) => {
  const { loading } = schemasOf(session);
  const waitingOn = loading.get(referencedFrom);
  if (!waitingOn) {
    return;
  }

  if (isWaitingOn(loading, uri, referencedFrom)) {
    throw Error(`The meta-schemas for the '${relativeFileUrl(referencedFrom)}' and '${relativeFileUrl(uri)}' dialects depend on each other`);
  }
  waitingOn.add(uri);
};

/** @type (loading: Map<Id, Set<Id>>, uri: Id, target: Id, visited?: Set<Id>) => boolean */
const isWaitingOn = (loading, uri, target, visited = new Set()) => {
  if (uri === target) {
    return true;
  }

  visited.add(uri);
  for (const next of loading.get(uri) ?? []) {
    if (!visited.has(next) && isWaitingOn(loading, next, target, visited)) {
      return true;
    }
  }

  return false;
};

/** @type (session: API.JsonSchemaSession, uri: Id) => Promise<Dialect> */
const loadDialect = async (session, uri) => {
  const { loading, dialects } = schemasOf(session);
  loading.set(uri, new Set());
  try {
    let metaSchema;
    try {
      // As it's written, so a meta-schema that's a reference isn't the one
      // it leads to
      metaSchema = await documentOf(session, await get(session, uri, { follow: false }));
    } catch (error) {
      throw Error(`Unable to retrieve the meta-schema for the '${relativeFileUrl(uri)}' dialect`, { cause: error });
    }

    if (!isSchemaDocument(metaSchema)) {
      throw Error(`The meta-schema for the '${relativeFileUrl(uri)}' dialect isn't a schema. It needs to be retrieved as 'application/schema+json' or from a '.schema.json' file.`);
    }

    const { definedDialect } = metaSchema;
    if (!definedDialect) {
      throw Error(`The meta-schema for the '${relativeFileUrl(uri)}' dialect doesn't define a dialect (with '$vocabulary', for example). Add it to the 'dialects' config.`);
    }

    // The dialect is identified by whichever URI found the meta-schema
    const dialect = withValidateFormats({ ...definedDialect, uri }, session.jsonSchema.config);
    dialects[uri] = dialect;
    return dialect;
  } finally {
    loading.delete(uri);
  }
};

/** @type typeof API.annotation */
export const annotation = (session, node, keyword, dialectUri = v1DialectUri) => {
  const values = node.data?.annotations?.get(keywordUri(session, keyword, dialectUri)) ?? [];
  return /** @type any[] */ (values);
};

/**
 * A keyword URI is used as it is, so it doesn't need the dialect. An
 * unknown keyword's URI has its name as the fragment, and its definition is
 * registered without it. A name that isn't a keyword in the dialect is an
 * unknown keyword.
 *
 * @type (session: API.JsonSchemaSession, keyword: string, dialectUri: string) => string
 */
const keywordUri = (session, keyword, dialectUri) => {
  if (session.jsonSchema.hasKeyword(keywordDefinitionUri(keyword))) {
    return keyword;
  }

  const id = toId(dialectUri);
  const dialect = dialectOf(session, id);
  if (!dialect) {
    throw Error(`The '${relativeFileUrl(id)}' dialect isn't defined in this session`);
  }

  return Object.hasOwn(dialect.keywords, keyword)
    ? dialect.keywords[keyword]
    : `${unknownKeyword.uri}#${encodeIriFragment(keyword)}`;
};
