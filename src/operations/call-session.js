import { JsonSchemaHyperjump } from "../session.js";

/**
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 * @import { SessionOptions } from "../session.d.ts"
 */

// What every operation runs in. It isn't part of the API.

/**
 * A session for one call. It sees the config's registry and the call's as
 * one registry, and the call's `allowRetrieval` replaces the config's.
 *
 * @type (config: JsonSchemaConfig, options?: SessionOptions) => JsonSchemaHyperjump
 */
export const callSession = (config, options = {}) => {
  const sessionConfig = { ...config };
  if (options.allowRetrieval !== undefined) {
    sessionConfig.allowRetrieval = options.allowRetrieval;
  }
  if (options.registry !== undefined) {
    sessionConfig.registry = config.registry === undefined ? options.registry : config.registry.concat(options.registry);
  }
  return new JsonSchemaHyperjump(sessionConfig);
};
