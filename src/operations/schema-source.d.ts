import type { AnySchema } from "../json-schema.d.ts";

/**
 * A schema's URI, or the schema itself. A schema given as a value is only
 * for that call, in its registry. It's identified by its `$id`, or by a new `urn:uuid:` URI
 * if it doesn't have one, which its relative references are resolved
 * against. An `$id` that a schema in a registry also has is an error, even
 * if they're identical. Nothing is cached, so a schema given as a value is
 * compiled on every call. Use `validator` to validate many instances. A
 * boolean has no `$schema`, so it needs the `dialectUri` option.
 *
 * A value is checked against the config's schema type, like
 * `V1Schema` for one with the v1 dialect. A URI isn't checked.
 */
export type SchemaSource<S = AnySchema> = string | S;
