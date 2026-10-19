/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { SchemaRegistry } from "./schema-registry.d.ts"
 */

// Each SchemaRegistry's entries, for the modules that index registries.
// They aren't part of the API.

/**
 * A schema as it was added. It never changes, so everything derived from it
 * can be cached.
 *
 * @typedef {{
 *   schema: Json | string;
 *   retrievalUri?: string;
 *   dialectUri?: string;
 * }} RegistryEntry
 */

/** @type WeakMap<SchemaRegistry, readonly RegistryEntry[]> */
const registryEntries = new WeakMap();

/** @type (registry: SchemaRegistry) => readonly RegistryEntry[] */
export const entriesOf = (registry) => /** @type readonly RegistryEntry[] */ (registryEntries.get(registry));

/** @type (registry: SchemaRegistry, entries: RegistryEntry[]) => void */
export const setEntries = (registry, entries) => {
  registryEntries.set(registry, Object.freeze(entries));
};
