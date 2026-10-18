/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { SchemaRegistry } from "./schema-registry.d.ts"
 */

// The state of each SchemaRegistry, for the modules that keep track of
// registries. It isn't part of the API.

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

/**
 * Something that keeps track of a registry's entries, like a JsonSchema's
 * index of them. Adding is in two steps so an entry that any listener
 * rejects isn't added for any of them.
 *
 * @typedef {{
 *   prepareAdd: (entry: RegistryEntry) => () => void;
 *   removed: (entry: RegistryEntry, version: number) => void;
 * }} RegistryListener
 */

/**
 * @typedef {{
 *   version: number;
 *   entries: Map<RegistryEntry, number>;
 *   byRetrievalUri: Map<string, RegistryEntry>;
 *   listeners: Set<WeakRef<RegistryListener>>;
 * }} RegistryState
 */

/**
 * @type WeakMap<SchemaRegistry, RegistryState>
 */
export const registryStates = new WeakMap();

/** @type (state: RegistryState) => Generator<RegistryListener> */
export const liveListeners = function* (state) {
  for (const ref of state.listeners) {
    const listener = ref.deref();
    if (listener === undefined) {
      state.listeners.delete(ref);
    } else {
      yield listener;
    }
  }
};

/**
 * The current version of a registry. It changes every time an entry is added
 * or removed.
 *
 * @type (registry: SchemaRegistry) => number
 */
export const registryVersion = (registry) => /** @type RegistryState */ (registryStates.get(registry)).version;

/**
 * Start keeping track of a registry. The listener is told about every change
 * from now on, and gets the entries the registry has now with the version
 * each was added in. The registry only holds the listener weakly.
 *
 * @type (registry: SchemaRegistry, listener: RegistryListener) => Map<RegistryEntry, number>
 */
export const listenToRegistry = (registry, listener) => {
  const state = /** @type RegistryState */ (registryStates.get(registry));
  state.listeners.add(new WeakRef(listener));
  return new Map(state.entries);
};
