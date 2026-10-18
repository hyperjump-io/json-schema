import { toAbsoluteIri } from "@hyperjump/uri";
import { liveListeners, registryStates } from "./registry-state.js";

/**
 * @import { RegistryEntry, RegistryState } from "./registry-state.js"
 * @import * as API from "./schema-registry.d.ts"
 */

/** @implements API.SchemaRegistry */
export class SchemaRegistry {
  constructor() {
    registryStates.set(this, {
      version: 0,
      entries: new Map(),
      byRetrievalUri: new Map(),
      listeners: new Set()
    });
  }

  /** @type API.SchemaRegistry["add"] */
  add(schema, options = {}) {
    const state = /** @type RegistryState */ (registryStates.get(this));

    /** @type RegistryEntry */
    const entry = Object.freeze({
      schema: schema,
      retrievalUri: options.retrievalUri === undefined ? undefined : toAbsoluteIri(options.retrievalUri),
      dialectUri: options.dialectUri === undefined ? undefined : toAbsoluteIri(options.dialectUri)
    });

    if (entry.retrievalUri !== undefined && state.byRetrievalUri.has(entry.retrievalUri)) {
      throw Error(`A schema has already been added with the retrieval URI '${entry.retrievalUri}'. Use the 'remove' function first to replace it.`);
    }

    const commits = [];
    const errors = [];
    for (const listener of liveListeners(state)) {
      try {
        commits.push(listener.prepareAdd(entry));
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(errors, "The schema can't be added");
    }

    state.version++;
    state.entries.set(entry, state.version);
    if (entry.retrievalUri !== undefined) {
      state.byRetrievalUri.set(entry.retrievalUri, entry);
    }
    for (const commit of commits) {
      commit();
    }
  }

  /** @type API.SchemaRegistry["remove"] */
  remove(retrievalUri) {
    const state = /** @type RegistryState */ (registryStates.get(this));
    const entry = state.byRetrievalUri.get(toAbsoluteIri(retrievalUri));
    if (entry === undefined) {
      return;
    }

    state.version++;
    state.entries.delete(entry);
    state.byRetrievalUri.delete(/** @type string */ (entry.retrievalUri));
    for (const listener of liveListeners(state)) {
      listener.removed(entry, state.version);
    }
  }
}
