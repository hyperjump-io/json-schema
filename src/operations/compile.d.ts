import type { Json, ReadonlyJson } from "@hyperjump/browser";
import type { JsonSchemaConfig } from "../json-schema.d.ts";
import type { SessionOptions } from "../session.d.ts";
import type { SchemaSource } from "./schema-source.d.ts";

declare const compiledSchema: unique symbol;

/**
 * A compiled schema. It's opaque: use it with `validatorFor` or
 * `annotatorFor`, or keep it with `serialize`. It doesn't need the session
 * it was compiled in.
 */
export type CompiledSchema = {
  /** The URI of the compiled schema */
  readonly uri: string;
  readonly [compiledSchema]: true;
};

/**
 * Compile a schema, to evaluate it any number of times or to keep it.
 * `validator` and `annotator` compile and return a function, which is
 * simpler when that's all you need.
 *
 * @throws SchemaError if a schema has problems. It has every problem in
 * the first document found to have any. Two documents the schema reaches
 * that have different resources with the same URI are a problem
 * (`duplicate-id`), because a compiled schema names a schema by its URI.
 * @throws Error if a reference ends at something that isn't a schema. Its
 * `cause.code` is `ERR_NOT_A_SCHEMA`.
 * @throws An error from `@hyperjump/browser` if a schema can't be
 * retrieved. Its `cause.code` says why.
 */
export function compile<S>(config: JsonSchemaConfig<S>, schema: NoInfer<SchemaSource<S>>, options?: SessionOptions): Promise<CompiledSchema>;

/**
 * The compiled schema as JSON, to be restored with {@link restore} without
 * compiling again. It's the kernel as it was lowered (see `Kernel`). For a
 * schema in a file, its `file:` URIs are relative to it: `#/properties/a`
 * in its own document and `common/address.json#/type` in another. So it
 * doesn't say where the files are, and it can be restored on another
 * machine. Other URIs are absolute.
 */
export function serialize(compiled: CompiledSchema): Json;

/**
 * Restore a compiled schema from {@link serialize}. It doesn't retrieve
 * anything, but it needs the same keywords in the config.
 *
 * A schema in a file is serialized with its `file:` URIs relative to it.
 * `uri` is where it is now, like `pathToFileURL("schemas/person.json")`,
 * which they're resolved against, so its locations in output and plugins
 * are its files. Without it, they stay relative.
 *
 * @throws Error if the compiled schema is in a kernel version other than
 * this library's (`kernel: 1`), or if a keyword or asserting format in it
 * isn't in the config.
 */
export function restore(config: JsonSchemaConfig, serialized: ReadonlyJson, options?: RestoreOptions): CompiledSchema;

export type RestoreOptions = {
  /**
   * Where the schema that was serialized is now, to resolve its relative
   * `file:` URIs against
   */
  uri?: string;
};
