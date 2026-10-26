import type { Json } from "@hyperjump/browser/json";
import type { JsonSchema } from "../../json-schema.d.ts";
import type { Dialect, SchemaOf } from "../../dialect.d.ts";
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
 */
export const draft04Dialect: Dialect;

/**
 * Add JSON Schema draft-04: its keywords, formats, and dialect. Its own are
 * its `dependencies`, `enum`, `required`, `maximum`, `minimum`,
 * `exclusiveMaximum`, and `exclusiveMinimum`, draft-07's `$id` (`id`),
 * `$ref`, and `format`, 2019-09's `items` and `additionalItems`, 2020-12's
 * `type`, and draft-06's `hostname` format. Its `enum`,
 * `required`, and `dependencies` can't be empty or have duplicates, as
 * draft-04 says, and its `exclusiveMaximum` and `exclusiveMinimum` require
 * `maximum` and `minimum`.
 *
 * Every other keyword and format it uses is shared with the other presets.
 * Each preset adds the ones it uses that haven't been added, so presets don't
 * depend on each other, and a keyword or format you replaced stays replaced.
 *
 * @throws Error if it's already been added
 */
export function addDraft04(jsonSchema: JsonSchema): void;

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
 * The types of the keywords {@link addDraft04} adds to the draft-04
 * dialect, by name, for {@link SchemaOf}
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
