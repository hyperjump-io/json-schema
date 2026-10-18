import type { Json } from "@hyperjump/browser/json";

/**
 * Schemas that aren't retrieved from a URI. A schema is identified the way
 * JSON Schema identifies it: by its `$id` (or `id` in draft-04), resolved
 * against `retrievalUri`, or by `retrievalUri` if it doesn't have one. It's
 * also found by its `retrievalUri`, like a retrieved schema. Only the root
 * resource is identified. Embedded resources are only found from the same
 * document.
 *
 * A registry isn't tied to a {@link JsonSchema}. One registry can be used by
 * any number of them and their sessions, which each identify its schemas
 * with their own dialects. A registry is only changed with `add` and
 * `remove`. A session sees the registry as it was when the session was
 * created.
 */
export class SchemaRegistry {
  /**
   * Every {@link JsonSchema} the registry is used with identifies the schema
   * when it's added. A schema whose dialect isn't defined yet is identified
   * once it is.
   *
   * @param schema - JSON text keeps its positions in messages.
   * @param options.retrievalUri - The schema's URI if it doesn't have an
   * `$id`, and the base URI for a relative `$id`. It's also how the schema
   * is removed. It can be a `file:` URI.
   * @param options.dialectUri - The dialect if the schema doesn't have
   * `$schema`
   *
   * @throws Error if the `retrievalUri` is already in the registry, or a
   * {@link JsonSchema} the registry is used with can't identify the schema,
   * its URI is already in the registry, or it's a keyword's URI. If
   * there's more than one problem, it's an `AggregateError`. The schema isn't
   * added.
   */
  add(schema: Json | string, options?: SchemaRegistryAddOptions): void;

  /**
   * Remove the schema added with this `retrievalUri`. A schema added without
   * one can't be removed. Sessions that already exist still see it.
   */
  remove(retrievalUri: string): void;
}

export type SchemaRegistryAddOptions = {
  retrievalUri?: string;
  dialectUri?: string;
};
