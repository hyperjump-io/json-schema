import { JsonSchemaSession } from "../session.js";
import { addSchemaValue } from "../registry/session-registries.js";

/**
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { SessionOptions } from "../session.d.ts"
 * @import { Context, SchemaSource } from "./context.d.ts"
 */

// What every operation does with its context and schema. It isn't part of
// the API.

/**
 * The session an operation runs in: the one it was given, or a new one for
 * a `JsonSchema`. A session already has its registry and what it can
 * retrieve, so the options that set them are only for a `JsonSchema`.
 *
 * @type (context: Context, options?: SessionOptions) => JsonSchemaSession
 */
export const sessionOf = (context, options = {}) => {
  if (context instanceof JsonSchemaSession) {
    if (options.registry !== undefined || options.allowRetrieval !== undefined) {
      throw TypeError("A session already has its registry and allowRetrieval. Pass them when creating the session, or pass the JsonSchema instead.");
    }
    return context;
  }

  return /** @type JsonSchema */ (context).session({ registry: options.registry, allowRetrieval: options.allowRetrieval });
};

/**
 * The URI of the schema an operation is given. A schema given as a value is
 * added to the session.
 *
 * @type (session: JsonSchemaSession, schema: SchemaSource) => string
 */
export const schemaUri = (session, schema) => typeof schema === "string" ? schema : addSchemaValue(session, schema);
