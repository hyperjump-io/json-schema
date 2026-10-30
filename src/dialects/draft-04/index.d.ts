import type { Json } from "@hyperjump/browser/json";
import type { DialectConfig, SchemaOf } from "../../dialect.d.ts";
import type { Keyword } from "../../keyword.d.ts";
import type { Expression, TypeName } from "../../kernel/kernel.d.ts";

/**
 * The URI of the JSON Schema draft-04 dialect. `$schema` is usually
 * `http://json-schema.org/draft-04/schema#`, which identifies the same
 * dialect.
 */
export const draft04DialectUri: "http://json-schema.org/draft-04/schema";

/**
 * The JSON Schema draft-04 dialect. `$ref` replaces the whole schema, so its
 * siblings are ignored. Unknown keywords are ignored. `format` validates by
 * default, as most implementations of these drafts did. Set the
 * `validateFormats` config to `false` to make it only an annotation. A
 * format the draft doesn't define is only an annotation either way.
 *
 * Its meta-schema doesn't define it, so it's in the `dialects` config, with
 * its keywords and formats.
 */
export const draft04Dialect: DialectConfig;

/**
 * The type of a JSON Schema draft-04 schema, for checking schemas written
 * in TypeScript. Unknown keywords are ignored, so any keyword is allowed,
 * but the values of the dialect's keywords are checked. `$ref` replaces the
 * whole schema, but the type doesn't know that, so its siblings are still
 * checked. Add the types of custom keywords by name.
 *
 * ```ts
 * const schema = {
 *   type: "object",
 *   properties: { name: { type: "string" } }
 * } satisfies Draft04Schema;
 * ```
 */
export type Draft04Schema<Extension extends Record<string, Keyword<any, any, any>> = {}> = SchemaOf<Draft04Keywords & Extension, typeof draft04DialectUri, "ignore">;

/**
 * The types of the draft-04 dialect's keywords, by name, for
 * {@link SchemaOf}
 */
export type Draft04Keywords = {
  additionalItems: Keyword<Expression, "schema">;
  additionalProperties: Keyword<Expression, "schema">;
  allOf: Keyword<Expression[], { array: "schema" }>;
  anyOf: Keyword<Expression[], { array: "schema" }>;
  default: Keyword<Json, "data">;
  definitions: Keyword<[string, Expression][], { map: "schema" }>;
  dependencies: Keyword<[string, Expression | string[]][], { map: ["schema", { array: "data" }] }>;
  description: Keyword<string, "data">;
  enum: Keyword<Json[], "data">;
  exclusiveMaximum: Keyword<boolean, "data">;
  exclusiveMinimum: Keyword<boolean, "data">;
  format: Keyword<string, "data">;
  id: Keyword<string, "data">;
  items: Keyword<Expression | Expression[], ["schema", { array: "schema" }]>;
  maximum: Keyword<number, "data">;
  maxItems: Keyword<number, "data">;
  maxLength: Keyword<number, "data">;
  maxProperties: Keyword<number, "data">;
  minimum: Keyword<number, "data">;
  minItems: Keyword<number, "data">;
  minLength: Keyword<number, "data">;
  minProperties: Keyword<number, "data">;
  multipleOf: Keyword<number, "data">;
  not: Keyword<Expression, "schema">;
  oneOf: Keyword<Expression[], { array: "schema" }>;
  pattern: Keyword<string, "data">;
  patternProperties: Keyword<[string, Expression][], { map: "schema" }>;
  properties: Keyword<[string, Expression][], { map: "schema" }>;
  $ref: Keyword<string, "data">;
  required: Keyword<string[], "data">;
  title: Keyword<string, "data">;
  type: Keyword<TypeName | TypeName[], "data">;
  uniqueItems: Keyword<boolean, "data">;
};
