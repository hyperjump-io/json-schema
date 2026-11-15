import type { AnyDialectConfig, JsonOrSchemaMediaType, JsonSchemaOptions, SchemaMediaType, SchemaOfDialects } from "./json-schema.d.ts";

/**
 * The JSON Schema media types: JSON Schema, and JSON that can be a schema,
 * in that order, made with the definitions schemas are read with.
 * `jsonSchemaConfig` puts them in a config. It isn't exported from the
 * package.
 *
 * @throws Error if a dialect is in the options more than once, or a dialect
 * or vocabulary names a keyword that has no definition.
 */
// Without a default for D, which TypeScript would pick instead of inferring
// it when a dialect in the options has a function with untyped parameters
export function jsonSchemaMediaTypes<const D extends AnyDialectConfig>(
  options?: JsonSchemaOptions<D>
): readonly [SchemaMediaType<SchemaOfDialects<D>>, JsonOrSchemaMediaType];
