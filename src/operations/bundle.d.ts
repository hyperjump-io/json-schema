import type { JsonSchemaConfig } from "../json-schema.d.ts";
import type { Json } from "@hyperjump/browser";
import type { SessionOptions } from "../session.d.ts";
import type { SchemaSource } from "./schema-source.d.ts";

/**
 * Bundle a schema and every schema it references into one compound schema
 * document, the way the 2020-12 specification describes, in any dialect.
 * Each referenced document is embedded in the main schema's definitions
 * (`$defs`, or `definitions` in draft-04 through draft-07) with its
 * identifier, so references find it without being changed, and the bundle
 * gives the same output as the schemas it was made from.
 *
 * The whole document `uri` is in is bundled. References are `$ref` and
 * 2020-12's `$dynamicRef`, including ones in definitions nothing uses.
 * Meta-schemas aren't bundled.
 *
 * The main schema always has `$schema`. It's identified by its URI, unless
 * it's a file. A schema can't be identified by a file, so a main schema
 * from a file is identified by the `id` option, and each embedded file is
 * identified where it is relative to the main schema, resolved against
 * `id`, so references between them find the same schemas. A file with an
 * `$id` of its own, and anything that isn't a file, keeps its URI. A main
 * schema from a file that embeds nothing doesn't need `id`, and isn't
 * given an identifier without it.
 *
 * @throws Error if a schema can't be embedded: a reference finds a schema
 * that's identified by a different URI, the root of a referenced schema is
 * a `$ref` that replaces the whole object (draft-04 through draft-07),
 * which would ignore its identifier, a file would be embedded without
 * `id`, or the main schema's dialect has nowhere to put it. Also if `id`
 * isn't an absolute URI, is a file, or has a fragment.
 * @throws SchemaError if a schema has problems. Two documents in the
 * bundle that have different resources with the same URI are a problem
 * (`duplicate-id`).
 * @throws An error from `@hyperjump/browser` if a schema can't be
 * retrieved. Its `cause.code` says why.
 */
export function bundle<S>(config: JsonSchemaConfig<S>, schema: NoInfer<SchemaSource<S>>, options?: SessionOptions & BundleOptions): Promise<Json>;

export type BundleOptions = {
  /**
   * Give every embedded schema `$schema`. By default, only one whose dialect
   * is different from the main schema's has it.
   */
  alwaysIncludeDialect?: boolean;

  /**
   * The name of an embedded schema in the definitions: its identifier
   * (`uri`, the default) or a random UUID (`uuid`).
   */
  definitionNamingStrategy?: DefinitionNamingStrategy;

  /**
   * Schemas that will be available where the bundle is used, so they aren't
   * embedded, and neither is anything only they reference.
   */
  externalSchemas?: string[];

  /**
   * The main schema's identifier, for a main schema from a file, like
   * `https://example.com/schemas/person.schema.json`. A schema can't be
   * identified by a file, so each embedded file is identified relative to
   * it, where the file is relative to the main schema
   * (`https://example.com/schemas/common/address.schema.json`), and
   * references between them find the same schemas. It's needed to embed a
   * file that doesn't have an `$id` of its own. A schema that isn't a file,
   * or has an `$id`, keeps it. It has to be an absolute URI that isn't a
   * file, without a fragment.
   */
  id?: string;
};

export type DefinitionNamingStrategy = "uri" | "uuid";
