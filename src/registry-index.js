import { VFileMessage } from "vfile-message";
import { fromJson } from "@hyperjump/browser/json";
import { parseIri, toAbsoluteIri } from "@hyperjump/uri";
import { listenToRegistry, registryVersion } from "./registry-state.js";
import { vocabulariesOf } from "./vocabularies.js";

/**
 * @import { JsonNode } from "@hyperjump/browser/json"
 * @import { JsonSchema } from "./json-schema.d.ts"
 * @import { SchemaRegistry } from "./schema-registry.d.ts"
 * @import { RegistryEntry, RegistryListener } from "./registry-state.js"
 * @import { Dialect } from "./dialect.d.ts"
 * @import { ResolveContext } from "./keyword.d.ts"
 */

/**
 * An identified entry. A session at version `v` sees it if it was added at
 * or before `v` and wasn't removed by then.
 *
 * @typedef {{
 *   entry: RegistryEntry;
 *   uri: string;
 *   addedIn: number;
 *   removedIn?: number;
 * }} IndexedEntry
 */

/**
 * @typedef {{ uri: string } | { waitingFor: string }} Identification
 */

/**
 * A JsonSchema's index of a registry: each entry by the URI it's identified
 * by with the JsonSchema's dialects.
 *
 * @implements RegistryListener
 */
export class RegistryIndex {
  /** @type JsonSchema */
  #jsonSchema;

  /** @type SchemaRegistry */
  #registry;

  /** Whether this is a JsonSchema's registry of keyword schemas */
  #isInternal;

  /** @type Map<string, IndexedEntry[]> */
  #byUri;

  /** @type Map<RegistryEntry, IndexedEntry> */
  #indexed;

  /**
   * Entries whose dialect isn't defined yet, with the version they were
   * added in and the dialect they're waiting for
   *
   * @type Map<RegistryEntry, { addedIn: number; dialectUri: string }>
   */
  #waiting;

  /**
   * How many open sessions see each version of the registry
   *
   * @type Map<number, number>
   */
  #openSessions;

  /**
   * @param {JsonSchema} jsonSchema
   * @param {SchemaRegistry} registry
   * @param {boolean} [isInternal]
   */
  constructor(jsonSchema, registry, isInternal = false) {
    this.#jsonSchema = jsonSchema;
    this.#registry = registry;
    this.#isInternal = isInternal;
    this.#byUri = new Map();
    this.#indexed = new Map();
    this.#waiting = new Map();
    this.#openSessions = new Map();

    /** @type Error[] */
    const errors = [];
    for (const [entry, addedIn] of listenToRegistry(registry, this)) {
      try {
        this.#prepare(entry, addedIn)();
      } catch (error) {
        errors.push(/** @type Error */ (error));
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(errors, "The registry has schemas that can't be identified");
    }
  }

  /** @type RegistryListener["prepareAdd"] */
  prepareAdd(entry) {
    // The registry's version goes up by one when the entry is committed
    return this.#prepare(entry, registryVersion(this.#registry) + 1);
  }

  /** @type (entry: RegistryEntry, addedIn: number) => () => void */
  #prepare(entry, addedIn) {
    const identification = identify(this.#jsonSchema, entry, this.#isInternal);
    if ("waitingFor" in identification) {
      return () => {
        this.#waiting.set(entry, { addedIn, dialectUri: identification.waitingFor });
      };
    }

    this.#assertNotIndexed(entry, identification.uri);
    return () => {
      this.#index(entry, identification.uri, addedIn);
    };
  }

  /**
   * An entry is found by the URI it's identified by and by its retrieval
   * URI, like a retrieved schema is found by the URI it was retrieved from.
   *
   * @type (entry: RegistryEntry, uri: string) => string[]
   */
  #keys(entry, uri) {
    return entry.retrievalUri === undefined || entry.retrievalUri === uri ? [uri] : [uri, entry.retrievalUri];
  }

  /** @type (entry: RegistryEntry, uri: string) => void */
  #assertNotIndexed(entry, uri) {
    for (const key of this.#keys(entry, uri)) {
      if (this.#byUri.get(key)?.some((indexed) => indexed.removedIn === undefined)) {
        throw Error(`There's already a schema found by '${key}' in the registry`);
      }
    }
  }

  /** @type (entry: RegistryEntry, uri: string, addedIn: number) => void */
  #index(entry, uri, addedIn) {
    /** @type IndexedEntry */
    const indexed = { entry, uri, addedIn };
    this.#indexed.set(entry, indexed);

    for (const key of this.#keys(entry, uri)) {
      const entries = this.#byUri.get(key);
      if (entries) {
        entries.push(indexed);
      } else {
        this.#byUri.set(key, [indexed]);
      }
    }
  }

  /** @type RegistryListener["removed"] */
  removed(entry, version) {
    this.#waiting.delete(entry);

    const indexed = this.#indexed.get(entry);
    if (indexed) {
      indexed.removedIn = version;
      this.#indexed.delete(entry);
    }

    this.#prune();
  }

  /**
   * The entry identified by a URI that a session at a version sees
   *
   * @type (uri: string, version: number) => IndexedEntry | undefined
   */
  lookup(uri, version) {
    const found = this.#find(uri, version);
    if (found || this.#waiting.size === 0) {
      return found;
    }

    // An entry might be waiting for a dialect that's been defined since
    this.#identifyWaiting();
    return this.#find(uri, version);
  }

  /** @type (uri: string, version: number) => IndexedEntry | undefined */
  #find(uri, version) {
    return this.#byUri.get(uri)?.find((indexed) => {
      return indexed.addedIn <= version && (indexed.removedIn === undefined || indexed.removedIn > version);
    });
  }

  #identifyWaiting() {
    for (const [entry, { addedIn }] of this.#waiting) {
      try {
        const identification = identify(this.#jsonSchema, entry, this.#isInternal);
        if ("uri" in identification) {
          this.#assertNotIndexed(entry, identification.uri);
          this.#waiting.delete(entry);
          this.#index(entry, identification.uri, addedIn);
        }
      } catch (_error) {
        // It stays unidentified. It's reported when it's added if its dialect
        // is defined by then.
      }
    }
  }

  /**
   * The dialects that entries a session at a version sees are waiting for.
   * Those entries can't be found until the dialects are defined.
   *
   * @type (version: number) => Set<string>
   */
  waitingFor(version) {
    const dialects = new Set();
    for (const { addedIn, dialectUri } of this.#waiting.values()) {
      if (addedIn <= version) {
        dialects.add(dialectUri);
      }
    }

    return dialects;
  }

  /** The version a new session sees */
  open() {
    const version = registryVersion(this.#registry);
    this.#openSessions.set(version, (this.#openSessions.get(version) ?? 0) + 1);
    return version;
  }

  /** @type (version: number) => void */
  close(version) {
    const count = (this.#openSessions.get(version) ?? 1) - 1;
    if (count === 0) {
      this.#openSessions.delete(version);
    } else {
      this.#openSessions.set(version, count);
    }

    this.#prune();
  }

  /** Forget removed entries that no open session can see */
  #prune() {
    const oldest = Math.min(...this.#openSessions.keys());
    for (const [uri, entries] of this.#byUri) {
      const kept = entries.filter((indexed) => indexed.removedIn === undefined || indexed.removedIn > oldest);
      if (kept.length === 0) {
        this.#byUri.delete(uri);
      } else if (kept.length !== entries.length) {
        this.#byUri.set(uri, kept);
      }
    }
  }
}

/**
 * Find the URI an entry is identified by. That depends on the dialect, so
 * only the root's resolve hooks (`$id`) run. Nothing is retrieved, so an
 * entry whose dialect isn't defined has to wait for it.
 *
 * @type (jsonSchema: JsonSchema, entry: RegistryEntry, isInternal?: boolean) => Identification
 * @throws Error if the entry can't be identified
 */
export const identify = (jsonSchema, entry, isInternal = false) => {
  const { retrievalUri } = entry;
  const result = fromJson(entryText(entry));
  if (result.status !== "success" || result.node === undefined) {
    throw Error(`The schema${retrievalUri ? ` at '${retrievalUri}'` : ""} isn't valid JSON`, { cause: result.messages[0] });
  }

  const root = result.node;
  const $schemaNode = root.jsonType === "object" ? propertyValue(root, "$schema") : undefined;
  const $schema = $schemaNode?.jsonType === "string" ? $schemaNode.value : undefined;
  const dialectUri = $schema ?? entry.dialectUri ?? jsonSchema.config.defaultDialectUri;

  let uri = retrievalUri;
  if (root.jsonType === "object" && dialectUri !== undefined) {
    const dialect = identifyingDialect(jsonSchema, toAbsoluteIri(dialectUri), root, retrievalUri);
    if (dialect === undefined) {
      return { waitingFor: toAbsoluteIri(dialectUri) };
    }

    uri = baseUri(jsonSchema, root, dialect, retrievalUri);
  }

  if (uri === undefined) {
    throw Error("A schema in a registry needs an '$id' or a retrieval URI");
  }

  uri = toAbsoluteIri(uri);
  if (parseIri(uri).scheme === "file" && (retrievalUri === undefined || parseIri(retrievalUri).scheme !== "file")) {
    throw Error(`A schema that doesn't have a 'file:' retrieval URI can't be identified by one: ${uri}`);
  }
  for (const key of [uri, retrievalUri]) {
    if (!isInternal && key !== undefined && jsonSchema.hasKeyword(key)) {
      throw Error(`'${key}' identifies a keyword's schema, which can't be replaced`);
    }
  }

  return { uri };
};

/**
 * The dialect needed to read a schema's identifier. A self-describing
 * meta-schema is read with the dialect its own `$vocabulary` defines, as the
 * resolver does.
 *
 * @type (jsonSchema: JsonSchema, dialectUri: string, root: JsonNode, retrievalUri: string | undefined) => Dialect | undefined
 */
const identifyingDialect = (jsonSchema, dialectUri, root, retrievalUri) => {
  if (jsonSchema.hasDialect(dialectUri)) {
    return jsonSchema.getDialect(dialectUri);
  }

  const vocabularies = dialectUri === retrievalUri ? vocabulariesOf(/** @type any */ (root)) : undefined;
  return vocabularies && jsonSchema.dialectFromVocabularies(dialectUri, vocabularies);
};

/**
 * The base URI the root's identifier sets, if any. A root that's a reference
 * (draft-04 through draft-07 `$ref`) ignores its identifier.
 *
 * @type (jsonSchema: JsonSchema, root: JsonNode & { jsonType: "object" }, dialect: Dialect, retrievalUri: string | undefined) => string | undefined
 */
const baseUri = (jsonSchema, root, dialect, retrievalUri) => {
  /** @type string | undefined */
  let uri;
  let isReference = false;

  for (const property of root.children) {
    const [nameNode, valueNode] = property.children;
    const keywordUri = dialect.keywords[nameNode.value];
    const keyword = keywordUri !== undefined && jsonSchema.hasKeyword(keywordUri) ? jsonSchema.getKeyword(keywordUri) : undefined;
    if (!keyword?.resolve) {
      continue;
    }

    /** @type ResolveContext */
    const context = {
      baseUri: retrievalUri ?? "",
      dialectUri: dialect.uri,
      setBaseUri: (baseUri) => {
        uri = baseUri;
      },
      addAnchor: () => {},
      addDynamicAnchor: () => {},
      setReference: () => {
        isReference = true;
      },
      message: (reason) => {
        throw new VFileMessage(reason, { place: valueNode.position, ruleId: keyword.uri, source: "json-schema" });
      }
    };
    keyword.resolve(/** @type any */ (valueNode), context);
  }

  return isReference ? retrievalUri : uri ?? retrievalUri;
};

/**
 * The schema was parsed without errors, so it has no error nodes
 *
 * @type (node: JsonNode & { jsonType: "object" }, name: string) => JsonNode | undefined
 */
const propertyValue = (node, name) => {
  return /** @type JsonNode | undefined */ (node.children.find((property) => property.children[0].value === name)?.children[1]);
};

/** @type (entry: RegistryEntry) => string */
export const entryText = (entry) => {
  return typeof entry.schema === "string" ? entry.schema : JSON.stringify(entry.schema, null, "  ");
};
