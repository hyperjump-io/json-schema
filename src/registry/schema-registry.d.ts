import type { ReadonlyJson } from "@hyperjump/browser/json";

/**
 * Schemas that aren't retrieved from a URI. A schema is identified the way
 * JSON Schema identifies it: by its `$id` (or `id` in draft-04), resolved
 * against `retrievalUri`, or by `retrievalUri` if it doesn't have one.
 * Neither can be a `file:` URI. It's
 * also found by its `retrievalUri`, like a retrieved schema. Only the root
 * resource is identified. Embedded resources are only found from the same
 * document.
 *
 * A registry never changes. `with` and `without` return a new registry, and
 * a session sees the registries it was created with. A schema is copied when
 * it's added, so changing the value afterward doesn't change the registry. A registry isn't tied
 * to a {@link JsonSchema}. One registry can be used by any number of them
 * and their sessions, which each identify its schemas with their own
 * dialects when they look one up. A schema that can't be identified is
 * found by its `retrievalUri`, and finding it throws the problem. One
 * without a `retrievalUri` is reported when a lookup doesn't find anything.
 * Two schemas found by the same URI are an error when that URI is looked
 * up.
 *
 * `S` is the type of the schemas it takes, for checking schemas written in
 * TypeScript, such as `V1Schema`. A union takes schemas in more than one
 * dialect. JSON text isn't checked.
 *
 * ```ts
 * const registry = new SchemaRegistry<V1Schema>().with({
 *   $schema: "https://json-schema.org/v1",
 *   type: "string"
 * });
 * ```
 */
export class SchemaRegistry<S = ReadonlyJson> {
  /**
   * @throws Error if two entries have the same `retrievalUri`, or one is a
   * `file:` URI
   * @throws TypeError if a schema can't be made into JSON text, like one
   * with a cycle
   */
  constructor(entries?: Iterable<NoInfer<SchemaRegistryEntry<S>>>);

  /**
   * A registry that also has this schema
   *
   * @throws Error if the `retrievalUri` is already in the registry, or is a
   * `file:` URI
   * @throws TypeError if the schema can't be made into JSON text, like one
   * with a cycle
   */
  with(schema: S | string, options?: SchemaRegistryAddOptions): SchemaRegistry<S>;

  /**
   * A registry without the schema added with this `retrievalUri`. A schema
   * added without one can't be removed. If the registry doesn't have the
   * `retrievalUri`, it's returned unchanged.
   */
  without(retrievalUri: string): SchemaRegistry<S>;
}

export type SchemaRegistryAddOptions = {
  /**
   * The schema's URI if it doesn't have an `$id`, and the base URI for a
   * relative `$id`. It's also how the schema is removed. It can't be a
   * `file:` URI, because a schema in a file is retrieved from the file. Use
   * `origin` to say which file a schema came from.
   */
  retrievalUri?: string;

  /** The dialect if the schema doesn't have `$schema` */
  dialectUri?: string;

  /**
   * Where the schema came from, for the application, like the path of the
   * file it was read from. It's never used to find or identify the schema.
   * The schema's document has it (`JsonSchemaDocumentNode.origin`), and so
   * does every problem found in it (`SchemaMessage.origin`), so a tool can
   * show them where they are.
   */
  origin?: string;
};

export type SchemaRegistryEntry<S = ReadonlyJson> = SchemaRegistryAddOptions & {
  /** JSON text keeps its positions in messages. */
  schema: S | string;
};
