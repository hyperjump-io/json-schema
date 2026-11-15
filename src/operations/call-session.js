import { Hyperjump } from "@hyperjump/browser";
import { toId } from "../identifiers.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { assertOnlyValue } from "../registry/registry-lookup.js";

/**
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 * @import { SessionOptions } from "../session.d.ts"
 * @import { SchemaSource } from "./schema-source.d.ts"
 */

// What every operation runs in. It isn't part of the API.

/**
 * A session for one call, and the URI of its schema. It sees the config's
 * registry and the call's as one registry, and the call's `allowRetrieval`
 * replaces the config's. A schema given as a value is added to the
 * session's registry, found by a new `urn:uuid:` URI, which identifies it
 * if it doesn't have an `$id`, before the session is made, so the session's
 * registry never changes.
 *
 * @type (config: JsonSchemaConfig, schema: SchemaSource<unknown>, options?: SessionOptions) => { session: Hyperjump<JsonSchemaConfig>; uri: string }
 * @throws Error if a schema given as a value has an `$id` another schema in
 *   the registry has, even if they're identical
 */
export const callSession = (config, schema, options = {}) => {
  let registry = config.registry;
  if (options.registry !== undefined) {
    registry = registry === undefined ? options.registry : registry.concat(options.registry);
  }

  let uri = /** @type string */ (schema);
  if (typeof schema !== "string") {
    uri = toId(`urn:uuid:${crypto.randomUUID()}`);
    registry = (registry ?? new SchemaRegistry()).with(/** @type any */ (schema), { retrievalUri: uri });
    assertOnlyValue(config, registry, uri);
  }

  /** @type JsonSchemaConfig */
  const sessionConfig = { ...config, registry };
  if (options.allowRetrieval !== undefined) {
    sessionConfig.allowRetrieval = options.allowRetrieval;
  }
  return { session: new Hyperjump(sessionConfig), uri };
};
