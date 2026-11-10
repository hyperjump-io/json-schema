import { RetrievalError } from "@hyperjump/browser";
import { toId } from "../identifiers.js";
import { resolveSchemaText, resolveSchemaValue } from "../schema/resolve-text.js";
import { RegistryIndex } from "./registry-index.js";
import { SchemaRegistry } from "./schema-registry.js";

/**
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 * @import { ReadonlyJson } from "@hyperjump/browser"
 * @import { RegistryEntry } from "./registry-entries.js"
 * @import { IndexedEntry } from "./registry-index.js"
 * @import { Id } from "../identifiers.js"
 */

/**
 * Each session's registries, for operations that give a session a schema as
 * a value
 *
 * @type WeakMap<JsonSchemaSession, SessionRegistries>
 */
const sessionRegistries = new WeakMap();

/**
 * Add a schema to a session as a value, and get the URI it's found by
 *
 * @type (session: JsonSchemaSession, schema: ReadonlyJson) => string
 */
export const addSchemaValue = (session, schema) => /** @type SessionRegistries */ (sessionRegistries.get(session)).addValue(schema);

/**
 * The schemas a session finds in the registries it sees
 */
export class SessionRegistries {
  /** @type JsonSchemaSession */
  #session;

  /**
   * The registries this session sees: its own, then the JsonSchema's as it
   * was when the session was created
   *
   * @type [SchemaRegistry | undefined, SchemaRegistry]
   */
  #registries;

  /**
   * Their indexes, which are made the first time the session looks for a
   * schema, so a session that never does doesn't identify anything
   *
   * @type RegistryIndex[] | undefined
   */
  #indexes;

  /**
   * Schemas operations were given as values, each in a registry of its own,
   * checked before the others
   *
   * @type RegistryIndex[]
   */
  #values;

  /**
   * Registry entries resolved in this session, for the ones that can't be
   * shared with other sessions
   *
   * @type Map<RegistryEntry, Promise<JsonSchemaDocumentNode>>
   */
  #documents;

  /**
   * @param {JsonSchemaSession} session
   * @param {SchemaRegistry} [sessionRegistry]
   */
  constructor(session, sessionRegistry) {
    const instanceRegistry = session.jsonSchema.registry;

    this.#session = session;
    this.#documents = new Map();
    this.#registries = [sessionRegistry === instanceRegistry ? undefined : sessionRegistry, instanceRegistry];
    this.#values = [];
    sessionRegistries.set(session, this);
  }

  /**
   * Add a schema given as a value. It's found by a new `urn:uuid:` URI,
   * which identifies it if it doesn't have an `$id`. One whose `$id` a
   * registry the session sees also has is an error, even if they're
   * identical, so a value can't replace a schema from a registry.
   *
   * @type (schema: ReadonlyJson) => string
   * @throws RetrievalError if a registry has a schema identified by its `$id`
   */
  addValue(schema) {
    const uri = toId(`urn:uuid:${crypto.randomUUID()}`);
    const jsonSchema = this.#session.jsonSchema;
    const instanceIndex = registryIndex(jsonSchema, this.#registries[1]);
    const index = new RegistryIndex(jsonSchema, new SchemaRegistry().with(schema, { retrievalUri: uri }), instanceIndex);
    this.#values.push(index);

    const id = index.lookup(uri)?.uri;
    if (id !== undefined && id !== uri) {
      this.#registryEntry(id);
    }

    return uri;
  }

  /** @type () => RegistryIndex[] */
  #registryIndexes() {
    if (!this.#indexes) {
      const jsonSchema = this.#session.jsonSchema;
      const [sessionRegistry, instanceRegistry] = this.#registries;
      const instanceIndex = registryIndex(jsonSchema, instanceRegistry);
      this.#indexes = sessionRegistry ? [registryIndex(jsonSchema, sessionRegistry, instanceIndex), instanceIndex] : [instanceIndex];
    }
    return this.#values.length === 0 ? this.#indexes : [...this.#values, ...this.#indexes];
  }

  /**
   * The schema document an identifier finds in the registries, if any
   *
   * @type (id: Id) => Promise<JsonSchemaDocumentNode> | undefined
   */
  get(id) {
    const indexed = this.#registryEntry(id);
    if (indexed) {
      return this.#document(indexed);
    }
  }

  /**
   * A schema in a registry that's waiting for its dialect or can't be
   * identified might be the one that was asked for, so a failure to retrieve
   * a URI says so. These are the reasons, if there are any.
   *
   * @type () => Error[]
   */
  missReasons() {
    /** @type Set<string> */
    const dialects = new Set();
    /** @type Error[] */
    const unidentified = [];
    for (const index of this.#registryIndexes()) {
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
    return reasons;
  }

  /**
   * The registry entry this session sees for an identifier
   *
   * @type (id: Id) => IndexedEntry | undefined
   */
  #registryEntry(id) {
    /** @type IndexedEntry | undefined */
    let found;
    for (const index of this.#registryIndexes()) {
      let indexed;
      try {
        indexed = index.lookup(id);
      } catch (error) {
        throw new RetrievalError(id, { cause: error });
      }
      if (indexed && found && indexed.entry !== found.entry) {
        throw new RetrievalError(id, {
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
    if (indexed.error) {
      // Resolving throws the problem that kept the entry from being
      // identified, with any others. If it didn't, it's still a problem.
      throw new RetrievalError(indexed.uri, { cause: indexed.error });
    }
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
 * Each JsonSchema's index of each registry it's used with, by the index of
 * the JsonSchema's registry whose dialects it can use, if any. They're all
 * held weakly, so a registry that was only used for one session can go
 * away.
 *
 * @type WeakMap<JsonSchema, WeakMap<RegistryIndex | JsonSchema, WeakMap<SchemaRegistry, RegistryIndex>>>
 */
const registryIndexes = new WeakMap();

/**
 * A registry is indexed the first time a session uses it.
 *
 * @type (jsonSchema: JsonSchema, registry: SchemaRegistry, dialectsFrom?: RegistryIndex) => RegistryIndex
 */
const registryIndex = (jsonSchema, registry, dialectsFrom) => {
  let byDialects = registryIndexes.get(jsonSchema);
  if (!byDialects) {
    byDialects = new WeakMap();
    registryIndexes.set(jsonSchema, byDialects);
  }

  const key = dialectsFrom ?? jsonSchema;
  let indexes = byDialects.get(key);
  if (!indexes) {
    indexes = new WeakMap();
    byDialects.set(key, indexes);
  }

  let index = indexes.get(registry);
  if (!index) {
    index = new RegistryIndex(jsonSchema, registry, dialectsFrom);
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
  const documentUri = entry.retrievalUri ?? uri;
  return entry.stringified
    ? resolveSchemaValue(JSON.parse(entry.schema), session, documentUri, entry.dialectUri, entry.origin)
    : resolveSchemaText(entry.schema, session, documentUri, entry.dialectUri, entry.origin);
};
