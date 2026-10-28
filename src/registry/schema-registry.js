import { parseIri, toAbsoluteIri } from "@hyperjump/uri";
import { entriesOf, setEntries } from "./registry-entries.js";

/**
 * @import { ReadonlyJson } from "@hyperjump/browser/json"
 * @import { RegistryEntry } from "./registry-entries.js"
 * @import * as API from "./schema-registry.d.ts"
 */

/** @implements API.SchemaRegistry */
export class SchemaRegistry {
  /**
   * @param {Iterable<API.SchemaRegistryEntry>} [entries]
   */
  constructor(entries = []) {
    /** @type RegistryEntry[] */
    const added = [];
    /** @type Set<string> */
    const retrievalUris = new Set();
    for (const { schema, ...options } of entries) {
      const entry = createEntry(schema, options);
      if (entry.retrievalUri !== undefined) {
        if (retrievalUris.has(entry.retrievalUri)) {
          throw Error(`More than one schema has the retrieval URI '${entry.retrievalUri}'`);
        }
        retrievalUris.add(entry.retrievalUri);
      }
      added.push(entry);
    }

    setEntries(this, added);
  }

  /** @type API.SchemaRegistry["with"] */
  with(schema, options = {}) {
    const entries = entriesOf(this);
    const entry = createEntry(schema, options);
    if (entry.retrievalUri !== undefined && entries.some(({ retrievalUri }) => retrievalUri === entry.retrievalUri)) {
      throw Error(`A schema has already been added with the retrieval URI '${entry.retrievalUri}'. Use the 'without' function first to replace it.`);
    }

    return fromEntries([...entries, entry]);
  }

  /** @type API.SchemaRegistry["without"] */
  without(retrievalUri) {
    const uri = toAbsoluteIri(retrievalUri);
    const entries = entriesOf(this);
    const kept = entries.filter((entry) => entry.retrievalUri !== uri);
    return kept.length === entries.length ? this : fromEntries(kept);
  }
}

/**
 * A schema is kept as JSON text, so changing the value after it's added
 * doesn't change the registry. A value is made into text when the schema is
 * resolved anyway.
 *
 * @type (schema: ReadonlyJson | string, options: API.SchemaRegistryAddOptions) => RegistryEntry
 */
const createEntry = (schema, options) => {
  const retrievalUri = options.retrievalUri === undefined ? undefined : toAbsoluteIri(options.retrievalUri);

  // A schema in a file is retrieved from the file. A registry identifying
  // one would be a way to read files that nothing retrieved.
  if (retrievalUri !== undefined && parseIri(retrievalUri).scheme === "file") {
    throw Error(`A schema in a registry can't have a 'file:' retrieval URI. A schema in a file is retrieved from it. Use 'origin' to say which file a schema came from.`);
  }

  return Object.freeze({
    schema: typeof schema === "string" ? schema : JSON.stringify(schema, null, "  "),
    retrievalUri: retrievalUri,
    dialectUri: options.dialectUri === undefined ? undefined : toAbsoluteIri(options.dialectUri),
    origin: options.origin
  });
};

/**
 * A registry with entries that were already created and checked
 *
 * @type (entries: RegistryEntry[]) => SchemaRegistry
 */
const fromEntries = (entries) => {
  const registry = new SchemaRegistry();
  setEntries(registry, entries);
  return registry;
};
