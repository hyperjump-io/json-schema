import type { ReadonlyJson } from "@hyperjump/browser/json";
import type { JsonSchema } from "../json-schema.d.ts";
import type { JsonSchemaSession, SessionOptions } from "../session.d.ts";

/**
 * What an operation runs with. Given a `JsonSchema`, it creates a session
 * for the call, with the call's `registry` and `allowRetrieval`. Given a
 * session, it uses it, so several operations share what it retrieved, and
 * those options can't be given.
 */
export type Context = JsonSchema | JsonSchemaSession;

/**
 * A schema's URI, or the schema itself. A schema given as a value is only
 * for that call. It's identified by its `$id`, or by a new `urn:uuid:` URI
 * if it doesn't have one, which its relative references are resolved
 * against. An `$id` that a schema in a registry also has is an error, even
 * if they're identical. Nothing is cached, so a schema given as a value is
 * compiled on every call. Use `validator` to validate many instances. A
 * boolean has no `$schema`, so it needs the `defaultDialectUri` config.
 */
export type SchemaSource = string | boolean | Exclude<ReadonlyJson, string | boolean | number | null | readonly ReadonlyJson[]>;

// Used by every operation. They aren't exported from the package.
export function sessionOf(context: Context, options?: SessionOptions): JsonSchemaSession;
export function schemaUri(session: JsonSchemaSession, schema: SchemaSource): string;
