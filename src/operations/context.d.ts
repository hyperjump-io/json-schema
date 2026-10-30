import type { AnySchema, JsonSchema } from "../json-schema.d.ts";
import type { JsonSchemaSession, SessionOptions } from "../session.d.ts";

/**
 * What an operation runs with. Given a `JsonSchema`, it creates a session
 * for the call, with the call's `registry` and `allowRetrieval`. Given a
 * session, it uses it, so several operations share what it retrieved, and
 * those options can't be given. `S` is its schema type, from its dialects.
 */
export type Context<S = any> = JsonSchema<S> | JsonSchemaSession<S>;

/**
 * A schema's URI, or the schema itself. A schema given as a value is only
 * for that call. It's identified by its `$id`, or by a new `urn:uuid:` URI
 * if it doesn't have one, which its relative references are resolved
 * against. An `$id` that a schema in a registry also has is an error, even
 * if they're identical. Nothing is cached, so a schema given as a value is
 * compiled on every call. Use `validator` to validate many instances. A
 * boolean has no `$schema`, so it needs the `defaultDialectUri` config.
 *
 * A value is checked against the context's schema type, like `V1Schema`
 * for a `JsonSchema` with the v1 dialect. A URI isn't checked.
 */
export type SchemaSource<S = AnySchema> = string | S;

// Used by every operation. They aren't exported from the package.
export function sessionOf(context: Context, options?: SessionOptions): JsonSchemaSession;
export function schemaUri(session: JsonSchemaSession, schema: SchemaSource<unknown>): string;
