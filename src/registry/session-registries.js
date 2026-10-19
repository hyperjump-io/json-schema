import { unified } from "unified";
import { VFile } from "vfile";
import { RetrievalError } from "@hyperjump/browser";
import { rejsonParse } from "@hyperjump/browser/json";
import { toAbsoluteIri } from "@hyperjump/uri";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { RegistryIndex, entryText } from "./registry-index.js";

/**
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 * @import { SchemaRegistry } from "./schema-registry.d.ts"
 * @import { RegistryEntry } from "./registry-entries.js"
 * @import { IndexedEntry } from "./registry-index.js"
 */

// Each JsonSchema's registries, for its sessions. They aren't part of the
// API.

/**
 * The registries added to each JsonSchema
 *
 * @type WeakMap<JsonSchema, SchemaRegistry[]>
 */
const addedRegistries = new WeakMap();

/** @type (jsonSchema: JsonSchema) => SchemaRegistry[] */
export const addedRegistriesOf = (jsonSchema) => {
  let registries = addedRegistries.get(jsonSchema);
  if (!registries) {
    registries = [];
    addedRegistries.set(jsonSchema, registries);
  }

  return registries;
};

/**
 * The schemas a session finds in the registries it sees
 */
export class SessionRegistries {
  /** @type JsonSchemaSession */
  #session;

  /**
   * The registries this session sees, session registries first
   *
   * @type RegistryIndex[]
   */
  #registries;

  /**
   * Registry entries resolved in this session, for the ones that can't be
   * shared with other sessions
   *
   * @type Map<RegistryEntry, Promise<JsonSchemaDocumentNode>>
   */
  #documents;

  /**
   * @param {JsonSchemaSession} session
   * @param {SchemaRegistry[]} sessionRegistries
   */
  constructor(session, sessionRegistries) {
    const jsonSchema = session.jsonSchema;

    this.#session = session;
    this.#documents = new Map();

    const registries = new Set([...sessionRegistries, ...addedRegistriesOf(jsonSchema)]);
    this.#registries = [...registries].map((registry) => registryIndex(jsonSchema, registry));
  }

  /**
   * The schema document a URI finds in the registries, if any
   *
   * @type (uri: string) => Promise<JsonSchemaDocumentNode> | undefined
   */
  get(uri) {
    const indexed = this.#registryEntry(uri);
    if (indexed) {
      return this.#document(indexed);
    }
  }

  /**
   * A schema in a registry that's waiting for its dialect or can't be
   * identified might be the one that was asked for, so a failure to retrieve
   * a URI says so.
   *
   * @type (uri: string, error: unknown) => unknown
   */
  retrievalError(uri, error) {
    /** @type Set<string> */
    const dialects = new Set();
    /** @type Error[] */
    const unidentified = [];
    for (const index of this.#registries) {
      const missing = index.missing();
      for (const dialect of missing.waitingFor) {
        dialects.add(dialect);
      }
      unidentified.push(...missing.unidentified);
    }

    /** @type Error[] */
    const reasons = [];
    if (dialects.size > 0) {
      reasons.push(Error(`Some schemas in registries can't be identified until these dialects are defined: ${[...dialects].join(", ")}`));
    }
    if (unidentified.length > 0) {
      reasons.push(new AggregateError(unidentified, "Some schemas in registries can't be identified"));
    }
    if (reasons.length === 0) {
      return error;
    }

    return new RetrievalError(`Unable to load resource '${uri}'`, { cause: new AggregateError([error, ...reasons], reasons[0].message) });
  }

  /**
   * The registry entry this session sees for a URI
   *
   * @type (uri: string) => IndexedEntry | undefined
   */
  #registryEntry(uri) {
    let id;
    try {
      id = toAbsoluteIri(uri);
    } catch (_error) {
      return;
    }

    /** @type IndexedEntry | undefined */
    let found;
    for (const index of this.#registries) {
      let indexed;
      try {
        indexed = index.lookup(id);
      } catch (error) {
        throw new RetrievalError(`Unable to load resource '${uri}'`, { cause: error });
      }
      if (indexed && found && indexed.entry !== found.entry) {
        throw new RetrievalError(`Unable to load resource '${uri}'`, {
          cause: Error(`More than one registry has a schema identified as '${id}'`)
        });
      }
      found ??= indexed;
    }

    return found;
  }

  /**
   * A registry entry is resolved the first time it's needed. If it only
   * uses dialects added to the JsonSchema, it's resolved once for every
   * session.
   *
   * @type (indexed: IndexedEntry) => Promise<JsonSchemaDocumentNode>
   */
  async #document(indexed) {
    const jsonSchema = this.#session.jsonSchema;
    const shared = sharedDocuments.get(jsonSchema)?.get(indexed.entry);
    if (shared) {
      return shared;
    }

    let pending = this.#documents.get(indexed.entry);
    if (!pending) {
      pending = resolveEntry(this.#session, indexed);
      this.#documents.set(indexed.entry, pending);
    }

    const document = await pending;
    if (Object.values(document.embedded).every((resource) => resource.dialectUri === undefined || jsonSchema.hasDialect(resource.dialectUri))) {
      let documents = sharedDocuments.get(jsonSchema);
      if (!documents) {
        documents = new WeakMap();
        sharedDocuments.set(jsonSchema, documents);
      }
      documents.set(indexed.entry, pending);
    }

    return document;
  }
}

/**
 * Each JsonSchema's index of each registry it's used with. Both are held
 * weakly, so a registry that was only used for one session can go away.
 *
 * @type WeakMap<JsonSchema, WeakMap<SchemaRegistry, RegistryIndex>>
 */
const registryIndexes = new WeakMap();

/**
 * A registry is indexed the first time a session uses it.
 *
 * @type (jsonSchema: JsonSchema, registry: SchemaRegistry) => RegistryIndex
 */
const registryIndex = (jsonSchema, registry) => {
  let indexes = registryIndexes.get(jsonSchema);
  if (!indexes) {
    indexes = new WeakMap();
    registryIndexes.set(jsonSchema, indexes);
  }

  let index = indexes.get(registry);
  if (!index) {
    index = new RegistryIndex(jsonSchema, registry);
    indexes.set(registry, index);
  }

  return index;
};

/**
 * Registry entries resolved with only the dialects added to a JsonSchema,
 * which every session of the JsonSchema can share
 *
 * @type WeakMap<JsonSchema, WeakMap<RegistryEntry, Promise<JsonSchemaDocumentNode>>>
 */
const sharedDocuments = new WeakMap();

/**
 * A registry entry is resolved like a retrieved schema, with its retrieval
 * URI as the document's URI.
 *
 * @type (session: JsonSchemaSession, indexed: IndexedEntry) => Promise<JsonSchemaDocumentNode>
 */
const resolveEntry = async (session, { entry, uri }) => {
  const file = new VFile(entryText(entry));
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session, uri: entry.retrievalUri ?? uri, dialectUri: entry.dialectUri });
  const document = await processor.run(processor.parse(file), file);

  // A schema with problems can't be used reliably, so any problem is fatal
  if (file.messages.length > 0) {
    const message = file.messages[0];
    message.fatal = true;
    throw new RetrievalError(`Unable to load resource '${uri}'`, { cause: message });
  }

  return document;
};
