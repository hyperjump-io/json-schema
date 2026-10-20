import { VFileMessage } from "vfile-message";
import { fromJs, fromJson } from "@hyperjump/browser/json";
import { parseIri, toAbsoluteIri } from "@hyperjump/uri";
import { entriesOf } from "./registry-entries.js";

/**
 * @import { JsonNode } from "@hyperjump/browser/json"
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { SchemaRegistry } from "./schema-registry.d.ts"
 * @import { RegistryEntry } from "./registry-entries.js"
 * @import { Dialect, DialectDefinition } from "../dialect.d.ts"
 * @import { ResolveContext } from "../keyword.d.ts"
 */

/**
 * An entry by a URI it's found by. One that can't be identified is found by
 * its retrieval URI, and finding it throws the problem.
 *
 * @typedef {{
 *   entry: RegistryEntry;
 *   uri: string;
 *   error?: Error;
 * }} IndexedEntry
 */

/**
 * `fromRegistry` is set if the entry was identified with a dialect another
 * entry in the same registry defines.
 *
 * @typedef {{
 *   uri: string;
 *   definedDialect?: DialectDefinition;
 *   fromRegistry?: true;
 * } | {
 *   error: Error;
 *   fromRegistry?: true;
 * } | {
 *   waitingFor: string;
 * }} Identification
 */

/**
 * Finds a dialect defined by an entry in the same registry
 *
 * @typedef {(dialectUri: string) => DialectDefinition | undefined} RegistryDialects
 */

/**
 * Identifications that only depend on the JsonSchema and the entry, which
 * every index of a registry with the entry can share. That's what keeps a
 * registry that's one edit away from another cheap to index.
 *
 * @type WeakMap<JsonSchema, WeakMap<RegistryEntry, Identification>>
 */
const identifications = new WeakMap();

/**
 * A JsonSchema's index of a registry: each entry by the URI it's identified
 * by with the JsonSchema's dialects. A registry never changes, so neither
 * does its index, except that entries waiting for a dialect are identified
 * once the JsonSchema has it.
 */
export class RegistryIndex {
  /** @type JsonSchema */
  #jsonSchema;

  /** @type Map<string, IndexedEntry[]> */
  #byUri;

  /**
   * The dialects entries define, by each URI the entry is found by
   *
   * @type Map<string, DialectDefinition>
   */
  #dialects;

  /**
   * Entries whose dialect isn't defined yet, with the dialect they're
   * waiting for
   *
   * @type Map<RegistryEntry, string>
   */
  #waiting;

  /**
   * The problems with entries that can't be identified and don't have a
   * retrieval URI to be found by
   *
   * @type Error[]
   */
  #unidentified;

  /**
   * @param {JsonSchema} jsonSchema
   * @param {SchemaRegistry} registry
   */
  constructor(jsonSchema, registry) {
    this.#jsonSchema = jsonSchema;
    this.#byUri = new Map();
    this.#dialects = new Map();
    this.#waiting = new Map();
    this.#unidentified = [];

    for (const entry of entriesOf(registry)) {
      this.#identify(entry);
    }
    this.#identifyWaiting();
  }

  /**
   * Index an entry. One that's waiting for a dialect is only found by its
   * retrieval URI until it's identified. Resolving it can still retrieve its
   * dialect's meta-schema, which identifying it can't.
   *
   * @type (entry: RegistryEntry) => boolean
   */
  #identify(entry) {
    let cache = identifications.get(this.#jsonSchema);
    if (!cache) {
      cache = new WeakMap();
      identifications.set(this.#jsonSchema, cache);
    }

    let identification = cache.get(entry);
    if (!identification) {
      identification = identify(this.#jsonSchema, entry, this.#registryDialect);
      if (!("waitingFor" in identification) && !identification.fromRegistry) {
        cache.set(entry, identification);
      }
    }

    const wasWaiting = this.#waiting.has(entry);
    if ("waitingFor" in identification) {
      if (!wasWaiting && entry.retrievalUri !== undefined) {
        this.#add(entry.retrievalUri, { entry, uri: entry.retrievalUri });
      }
      this.#waiting.set(entry, identification.waitingFor);
      return false;
    }

    if (wasWaiting) {
      this.#waiting.delete(entry);
      if (entry.retrievalUri !== undefined) {
        this.#remove(entry.retrievalUri, entry);
      }
    }

    if ("error" in identification) {
      if (entry.retrievalUri === undefined) {
        this.#unidentified.push(identification.error);
      } else {
        this.#add(entry.retrievalUri, { entry, uri: entry.retrievalUri, error: identification.error });
      }
      return true;
    }

    const { uri, definedDialect } = identification;

    // An entry is found by the URI it's identified by and by its retrieval
    // URI, like a retrieved schema is found by the URI it was retrieved from
    const keys = entry.retrievalUri === undefined || entry.retrievalUri === uri ? [uri] : [uri, entry.retrievalUri];
    for (const key of keys) {
      this.#add(key, { entry, uri });
      if (definedDialect) {
        this.#dialects.set(key, definedDialect);
      }
    }
    return true;
  }

  /** @type (key: string, indexed: IndexedEntry) => void */
  #add(key, indexed) {
    const entries = this.#byUri.get(key);
    if (entries) {
      entries.push(indexed);
    } else {
      this.#byUri.set(key, [indexed]);
    }
  }

  /** @type (key: string, entry: RegistryEntry) => void */
  #remove(key, entry) {
    const entries = /** @type IndexedEntry[] */ (this.#byUri.get(key)).filter((indexed) => indexed.entry !== entry);
    if (entries.length === 0) {
      this.#byUri.delete(key);
    } else {
      this.#byUri.set(key, entries);
    }
  }

  /** @type RegistryDialects */
  #registryDialect = (dialectUri) => this.#dialects.get(dialectUri);

  /**
   * Identifying an entry can define a dialect another entry is waiting for,
   * so this goes until nothing changes.
   */
  #identifyWaiting() {
    let changed = true;
    while (changed) {
      changed = false;
      for (const entry of this.#waiting.keys()) {
        changed = this.#identify(entry) || changed;
      }
    }
  }

  /**
   * The entry found by a URI
   *
   * @type (uri: string) => IndexedEntry | undefined
   * @throws Error if more than one entry is found by the URI, or the entry
   * can't be identified
   */
  lookup(uri) {
    let found = this.#byUri.get(uri);
    if (!found && this.#waiting.size > 0) {
      // An entry might be waiting for a dialect that's been added since
      this.#identifyWaiting();
      found = this.#byUri.get(uri);
    }

    if (!found) {
      return;
    } else if (found.length > 1) {
      throw Error(`More than one schema in the registry is found by '${uri}'`);
    } else if (found[0].error) {
      throw found[0].error;
    }

    return found[0];
  }

  /**
   * Why a lookup might not have found what it was looking for: the dialects
   * entries are waiting for, and the problems with entries that can't be
   * identified and don't have a retrieval URI to be found by
   *
   * @type () => { waitingFor: Set<string>; unidentified: Error[] }
   */
  missing() {
    return { waitingFor: new Set(this.#waiting.values()), unidentified: this.#unidentified };
  }
}

/**
 * What identifying an entry needs from its root: whether it's an object, its
 * `$schema`, and its properties. A property's value is only made into a node
 * for a keyword whose resolve hook runs.
 *
 * @typedef {{
 *   isObject: boolean;
 *   $schema?: string;
 *   properties: [string, () => JsonNode][];
 * }} Root
 */

/**
 * Find the URI an entry is identified by. That depends on the dialect, so
 * only the root's resolve hooks (`$id`, `$vocabulary`) run. Nothing is
 * retrieved, so an entry whose dialect isn't defined by the JsonSchema or
 * another entry in the same registry has to wait for it.
 *
 * Every entry is identified when a registry is first used, so it's parsed
 * with `JSON.parse`, which is much faster than building a tree with
 * positions. Only a problem needs positions, so the entry is parsed again
 * into a tree if there is one.
 *
 * @type (jsonSchema: JsonSchema, entry: RegistryEntry, registryDialect: RegistryDialects) => Identification
 */
export const identify = (jsonSchema, entry, registryDialect) => {
  const root = parsedRoot(entry);
  if (root) {
    const identification = identifyRoot(jsonSchema, entry, registryDialect, root);
    if (!("error" in identification)) {
      return identification;
    }
  }

  const { retrievalUri } = entry;
  const result = fromJson(entryText(entry));
  if (result.status !== "success" || result.node === undefined) {
    return { error: Error(`The schema${retrievalUri ? ` at '${retrievalUri}'` : ""} isn't valid JSON`, { cause: result.messages[0] }) };
  }

  return identifyRoot(jsonSchema, entry, registryDialect, nodeRoot(result.node));
};

/**
 * The root of an entry from `JSON.parse`. Its nodes don't have positions.
 * It's undefined if the entry isn't valid JSON.
 *
 * @type (entry: RegistryEntry) => Root | undefined
 */
const parsedRoot = (entry) => {
  let value;
  try {
    value = typeof entry.schema === "string" ? JSON.parse(entry.schema) : entry.schema;
  } catch {
    return;
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { isObject: false, properties: [] };
  }

  return {
    isObject: true,
    $schema: typeof value.$schema === "string" ? value.$schema : undefined,
    properties: Object.entries(value).map(([name, propertyValue]) => [name, () => fromJs(propertyValue)])
  };
};

/** @type (node: JsonNode) => Root */
const nodeRoot = (node) => {
  if (node.jsonType !== "object") {
    return { isObject: false, properties: [] };
  }

  const $schemaNode = propertyValue(node, "$schema");
  return {
    isObject: true,
    $schema: $schemaNode?.jsonType === "string" ? $schemaNode.value : undefined,
    properties: node.children.map((property) => [property.children[0].value, () => /** @type JsonNode */ (property.children[1])])
  };
};

/** @type (jsonSchema: JsonSchema, entry: RegistryEntry, registryDialect: RegistryDialects, root: Root) => Identification */
const identifyRoot = (jsonSchema, entry, registryDialect, root) => {
  const { retrievalUri } = entry;
  const dialectUri = root.$schema ?? entry.dialectUri ?? jsonSchema.config.defaultDialectUri;

  /** @type Dialect | undefined */
  let dialect;
  /** @type true | undefined */
  let fromRegistry;
  if (root.isObject && dialectUri !== undefined) {
    let absoluteDialectUri;
    try {
      absoluteDialectUri = toAbsoluteIri(dialectUri);
    } catch (error) {
      return { error: /** @type Error */ (error) };
    }

    if (jsonSchema.hasDialect(absoluteDialectUri)) {
      dialect = jsonSchema.getDialect(absoluteDialectUri);
    } else {
      const definition = registryDialect(absoluteDialectUri);
      if (definition === undefined) {
        return { waitingFor: absoluteDialectUri };
      }
      dialect = { ...definition, uri: absoluteDialectUri };
      fromRegistry = true;
    }
  }

  try {
    let uri = retrievalUri;
    /** @type DialectDefinition | undefined */
    let definedDialect;
    if (root.isObject && dialect !== undefined) {
      ({ uri, definedDialect } = rootEffects(jsonSchema, root, dialect, retrievalUri));
    }

    if (uri === undefined) {
      throw Error("A schema in a registry needs an '$id' or a retrieval URI");
    }

    uri = toAbsoluteIri(uri);
    if (parseIri(uri).scheme === "file" && (retrievalUri === undefined || parseIri(retrievalUri).scheme !== "file")) {
      throw Error(`A schema that doesn't have a 'file:' retrieval URI can't be identified by one: ${uri}`);
    }

    return { uri, definedDialect, fromRegistry };
  } catch (error) {
    return { error: /** @type Error */ (error), fromRegistry };
  }
};

/** @type (entry: RegistryEntry) => string */
export const entryText = (entry) => {
  return typeof entry.schema === "string" ? entry.schema : JSON.stringify(entry.schema, null, "  ");
};

/**
 * The base URI the root's identifier sets, if any, and the dialect it
 * defines. A root that's a reference (draft-04 through draft-07 `$ref`)
 * ignores both.
 *
 * @type (jsonSchema: JsonSchema, root: Root, dialect: Dialect, retrievalUri: string | undefined) => { uri?: string; definedDialect?: DialectDefinition }
 */
const rootEffects = (jsonSchema, root, dialect, retrievalUri) => {
  /** @type string | undefined */
  let uri;
  /** @type DialectDefinition | undefined */
  let definedDialect;
  let isReference = false;

  for (const [name, valueNodeOf] of root.properties) {
    const keywordUri = dialect.keywords[name];
    const keyword = keywordUri !== undefined && jsonSchema.hasKeyword(keywordUri) ? jsonSchema.getKeyword(keywordUri) : undefined;
    if (!keyword?.resolve) {
      continue;
    }

    const valueNode = valueNodeOf();

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
      defineDialect: (definition) => {
        definedDialect = definition;
      },
      message: (reason) => {
        throw new VFileMessage(reason, { place: valueNode.position, ruleId: keyword.uri, source: "json-schema" });
      }
    };
    keyword.resolve(/** @type any */ (valueNode), context);
  }

  return isReference ? { uri: retrievalUri } : { uri: uri ?? retrievalUri, definedDialect };
};

/**
 * The schema was parsed without errors, so it has no error nodes
 *
 * @type (node: JsonNode & { jsonType: "object" }, name: string) => JsonNode | undefined
 */
const propertyValue = (node, name) => {
  return /** @type JsonNode | undefined */ (node.children.find((property) => property.children[0].value === name)?.children[1]);
};
