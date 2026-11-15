import { urlToIri } from "@hyperjump/uri";
import { toId } from "../identifiers.js";
import { definitionsOf } from "../definition-of.js";
import { resolveSchemaText, resolveSchemaValue } from "../schema/resolve-text.js";
import { RegistryIndex } from "./registry-index.js";
import { DocumentResponse } from "./document-response.js";

/**
 * @import { Hyperjump } from "@hyperjump/browser"
 * @import { JsonSchemaConfig, JsonSchemaDefinitions } from "../json-schema.d.ts"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 * @import { SchemaRegistry } from "./schema-registry.d.ts"
 * @import { RegistryEntry } from "./registry-entries.js"
 * @import { IndexedEntry } from "./registry-index.js"
 */

// How a SchemaRegistry answers a session. It isn't part of the API.

/**
 * What a registry has for a URL, with the definitions in the session's
 * config: a response with the resolved document, or nothing. A URL that's
 * probably a schema in the registry that's waiting for its dialect, or
 * can't be identified, is an error, so it isn't retrieved instead.
 *
 * @type (registry: SchemaRegistry, url: string, session: Hyperjump<JsonSchemaConfig>) => Promise<Response | undefined>
 * @throws Error if more than one schema in the registry is found by the URL,
 *   or a schema that's probably found by it is waiting for its dialect or
 *   can't be identified
 */
export const registryResponse = async (registry, url, session) => {
  const definitions = definitionsOf(session.config);
  const index = registryIndex(definitions, registry);
  const id = toId(urlToIri(new URL(url)));
  const indexed = index.lookup(id);
  if (!indexed) {
    const missed = index.missed(id);
    if (missed) {
      throw missed;
    }
    return;
  }

  return new DocumentResponse(await documentOf(session, definitions, indexed));
};

/**
 * Check that a schema an operation is given as a value, added to the
 * registry with `uri` as its retrieval URI, is the only schema identified by
 * its `$id`, so a value can't replace a schema from a registry, even an
 * identical one.
 *
 * @type (config: JsonSchemaConfig, registry: SchemaRegistry, uri: string) => void
 * @throws Error if another schema in the registry is identified by its `$id`
 */
export const assertOnlyValue = (config, registry, uri) => {
  const index = registryIndex(definitionsOf(config), registry);
  const id = index.lookup(toId(uri))?.uri;
  if (id !== undefined && id !== uri) {
    index.lookup(id);
  }
};

/**
 * The index of each registry sessions see, by their definitions. They're
 * held weakly, so a registry that was only used for one call can go away.
 *
 * @type WeakMap<JsonSchemaDefinitions, WeakMap<SchemaRegistry, RegistryIndex>>
 */
const registryIndexes = new WeakMap();

/**
 * A registry is indexed the first time a session uses it.
 *
 * @type (definitions: JsonSchemaDefinitions, registry: SchemaRegistry) => RegistryIndex
 */
const registryIndex = (definitions, registry) => {
  let indexes = registryIndexes.get(definitions);
  if (!indexes) {
    indexes = new WeakMap();
    registryIndexes.set(definitions, indexes);
  }

  let index = indexes.get(registry);
  if (!index) {
    index = new RegistryIndex(definitions, registry);
    indexes.set(registry, index);
  }

  return index;
};

/**
 * Registry entries resolved with only the definitions' dialects, which every
 * session with the same definitions can share
 *
 * @type WeakMap<JsonSchemaDefinitions, WeakMap<RegistryEntry, Promise<JsonSchemaDocumentNode>>>
 */
const sharedDocuments = new WeakMap();

/** The key of the registry entries a session resolved, in its state */
const sessionDocumentsKey = {};

/**
 * A registry entry is resolved the first time it's needed. If it only uses
 * the definitions' dialects, it's resolved once for every session with the
 * same definitions. One that used a dialect only its session built belongs
 * to that session.
 *
 * @type (session: Hyperjump<JsonSchemaConfig>, definitions: JsonSchemaDefinitions, indexed: IndexedEntry) => Promise<JsonSchemaDocumentNode>
 */
const documentOf = async (session, definitions, indexed) => {
  const shared = sharedDocuments.get(definitions)?.get(indexed.entry);
  if (shared) {
    return shared;
  }

  /** @type Map<RegistryEntry, Promise<JsonSchemaDocumentNode>> */
  const documents = session.state(sessionDocumentsKey, () => new Map());
  let pending = documents.get(indexed.entry);
  if (!pending) {
    pending = resolveEntry(session, indexed);
    documents.set(indexed.entry, pending);
  }

  const document = await pending;
  if (indexed.error) {
    // Resolving throws the problem that kept the entry from being
    // identified, with any others. If it didn't, it's still a problem.
    throw indexed.error;
  }
  if (Object.values(document.embedded).every((resource) => resource.dialectUri === undefined || resource.dialectUri in definitions.dialects)) {
    let shareable = sharedDocuments.get(definitions);
    if (!shareable) {
      shareable = new WeakMap();
      sharedDocuments.set(definitions, shareable);
    }
    shareable.set(indexed.entry, pending);
  }

  return document;
};

/**
 * A registry entry is resolved like a retrieved schema, with its retrieval
 * URI as the document's URI.
 *
 * @type (session: Hyperjump<JsonSchemaConfig>, indexed: IndexedEntry) => Promise<JsonSchemaDocumentNode>
 */
const resolveEntry = async (session, { entry, uri }) => {
  const documentUri = entry.retrievalUri ?? uri;
  return entry.stringified
    ? resolveSchemaValue(JSON.parse(entry.schema), session, documentUri, entry.dialectUri, entry.origin)
    : resolveSchemaText(entry.schema, session, documentUri, entry.dialectUri, entry.origin);
};
