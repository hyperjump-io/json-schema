import { toId } from "../identifiers.js";
import { resolveSchemaText, resolveSchemaValue } from "../schema/resolve-text.js";
import { RegistryIndex } from "./registry-index.js";
import { SchemaRegistry } from "./schema-registry.js";

/**
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { JsonSchemaHyperjump } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 * @import { ReadonlyJson } from "@hyperjump/browser"
 * @import { SchemaRegistry as SchemaRegistryType } from "./schema-registry.d.ts"
 * @import { RegistryEntry } from "./registry-entries.js"
 * @import { IndexedEntry } from "./registry-index.js"
 * @import { Id } from "../identifiers.js"
 */

/**
 * The schemas a session finds in the registries it sees
 */
export class SessionRegistries {
  /** @type JsonSchemaHyperjump */
  #session;

  /**
   * The session's own registry, if it has one. The session sees it with the
   * config's registry, as one registry.
   *
   * @type SchemaRegistry | undefined
   */
  #registry;

  /**
   * The registry's index, which is made the first time the session looks
   * for a schema, so a session that never does doesn't identify anything
   *
   * @type RegistryIndex | undefined
   */
  #index;

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
   * @param {JsonSchemaHyperjump} session
   * @param {SchemaRegistry} [registry]
   */
  constructor(session, registry) {
    this.#session = session;
    this.#registry = registry;
    this.#documents = new Map();
    this.#values = [];
  }

  /**
   * Add a schema given as a value. It's found by a new `urn:uuid:` URI,
   * which identifies it if it doesn't have an `$id`. It can use the dialects
   * the registry's schemas define. One whose `$id` the registry also has is
   * an error, even if they're identical, so a value can't replace a schema
   * from a registry.
   *
   * @type (schema: ReadonlyJson) => string
   * @throws Error if the registry has a schema identified by its `$id`
   */
  addValue(schema) {
    const uri = toId(`urn:uuid:${crypto.randomUUID()}`);
    const index = new RegistryIndex(this.#session.jsonSchema, new SchemaRegistry().with(schema, { retrievalUri: uri }), this.#registryIndex());
    this.#values.push(index);

    const id = index.lookup(uri)?.uri;
    if (id !== undefined && id !== uri) {
      this.#registryEntry(id);
    }

    return uri;
  }

  /** @type () => RegistryIndex */
  #registryIndex() {
    this.#index ??= registryIndex(this.#session.jsonSchema, this.#registry);
    return this.#index;
  }

  /** @type () => RegistryIndex[] */
  #registryIndexes() {
    return this.#values.length === 0 ? [this.#registryIndex()] : [...this.#values, this.#registryIndex()];
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
      const indexed = index.lookup(id);
      if (indexed && found && indexed.entry !== found.entry) {
        throw Error(`More than one registry has a schema identified as '${id}'`);
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
      throw indexed.error;
    }
    if (Object.values(document.embedded).every((resource) => resource.dialectUri === undefined || resource.dialectUri in jsonSchema.dialects)) {
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
 * Each JsonSchema's index of the registry its sessions see with each
 * session registry, and its index of its config's registry alone, by the
 * JsonSchema. They're held weakly, so a registry that was only used for one
 * session can go away.
 *
 * @type WeakMap<JsonSchema, WeakMap<SchemaRegistry | JsonSchema, RegistryIndex>>
 */
const registryIndexes = new WeakMap();

/**
 * A registry is indexed the first time a session uses it. A session sees
 * the config's registry and its own as one registry, so a schema in either
 * can use a dialect a schema in the other defines.
 *
 * @type (jsonSchema: JsonSchema, registry: SchemaRegistry | undefined) => RegistryIndex
 */
const registryIndex = (jsonSchema, registry) => {
  let indexes = registryIndexes.get(jsonSchema);
  if (!indexes) {
    indexes = new WeakMap();
    registryIndexes.set(jsonSchema, indexes);
  }

  const key = registry ?? jsonSchema;
  let index = indexes.get(key);
  if (!index) {
    const configRegistry = jsonSchema.config.registry;
    let seen = configRegistry ?? registry ?? new SchemaRegistry();
    if (configRegistry !== undefined && registry !== undefined) {
      seen = configRegistry.concat(registry);
    }
    index = new RegistryIndex(jsonSchema, seen);
    indexes.set(key, index);
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
 * @type (session: JsonSchemaHyperjump, indexed: IndexedEntry) => Promise<JsonSchemaDocumentNode>
 */
const resolveEntry = async (session, { entry, uri }) => {
  const documentUri = entry.retrievalUri ?? uri;
  return entry.stringified
    ? resolveSchemaValue(JSON.parse(entry.schema), session, documentUri, entry.dialectUri, entry.origin)
    : resolveSchemaText(entry.schema, session, documentUri, entry.dialectUri, entry.origin);
};
