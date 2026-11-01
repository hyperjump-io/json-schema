import type { Json } from "@hyperjump/browser";
import type { DialectConfig, SchemaOf } from "../../dialect.d.ts";
import type { Keyword, Reference } from "../../keyword.d.ts";
import type { Expression, TypeName } from "../../kernel/kernel.d.ts";

/** The URI of the JSON Schema 2019-09 dialect */
export const draft201909DialectUri: "https://json-schema.org/draft/2019-09/schema";

/**
 * The JSON Schema 2019-09 dialect: the keywords of the vocabularies its
 * meta-schema lists. Unknown keywords are annotations. `format` is an
 * annotation by default. Set the `validateFormats` config to validate it.
 *
 * The meta-schema describes itself, so the dialect can't be built from it
 * and is in the `dialects` config instead, with its keywords and formats. It
 * also brings its vocabularies, so meta-schemas that extend 2019-09 with
 * `$vocabulary` define their own dialects. Add other vocabularies they can
 * use to the `vocabularies` config.
 */
export const draft201909Dialect: DialectConfig<Draft201909Keywords, typeof draft201909DialectUri, "annotation">;

/**
 * The type of a JSON Schema 2019-09 schema, for checking schemas written in
 * TypeScript. Unknown keywords are annotations, so any keyword is allowed,
 * but the values of the dialect's keywords are checked. Add the types of
 * custom keywords by name.
 *
 * ```ts
 * const schema = {
 *   type: "object",
 *   properties: { name: { type: "string" } }
 * } satisfies Draft201909Schema;
 * ```
 */
export type Draft201909Schema<Extension extends Record<string, Keyword<any, any, any>> = {}> = SchemaOf<Draft201909Keywords & Extension, typeof draft201909DialectUri, "annotation">;

/**
 * The types of the 2019-09 dialect's keywords, by name, for
 * {@link SchemaOf}
 */
export type Draft201909Keywords = {
  $anchor: Keyword<string, "data">;
  $comment: Keyword<string, "data">;
  $defs: Keyword<[string, Expression][], { map: "schema" }>;
  $id: Keyword<string, "data">;
  $recursiveAnchor: Keyword<boolean, "data">;
  $recursiveRef: Keyword<Reference, "reference">;
  $ref: Keyword<Reference, "reference">;
  $vocabulary: Keyword<Record<string, boolean>, "data">;
  additionalItems: Keyword<Expression, "schema">;
  additionalProperties: Keyword<Expression, "schema">;
  allOf: Keyword<Expression[], { array: "schema" }>;
  anyOf: Keyword<Expression[], { array: "schema" }>;
  contains: Keyword<Expression, "schema">;
  dependentSchemas: Keyword<[string, Expression][], { map: "schema" }>;
  if: Keyword<Expression, "schema">;
  then: Keyword<Expression, "schema">;
  else: Keyword<Expression, "schema">;
  items: Keyword<Expression | Expression[], ["schema", { array: "schema" }]>;
  not: Keyword<Expression, "schema">;
  oneOf: Keyword<Expression[], { array: "schema" }>;
  patternProperties: Keyword<[string, Expression][], { map: "schema" }>;
  properties: Keyword<[string, Expression][], { map: "schema" }>;
  propertyNames: Keyword<Expression, "schema">;
  unevaluatedItems: Keyword<Expression, "schema">;
  unevaluatedProperties: Keyword<Expression, "schema">;
  const: Keyword<Json, "data">;
  dependentRequired: Keyword<Record<string, string[]>, "data">;
  enum: Keyword<Json[], "data">;
  exclusiveMaximum: Keyword<number, "data">;
  exclusiveMinimum: Keyword<number, "data">;
  maxContains: Keyword<number, "data">;
  maxItems: Keyword<number, "data">;
  maxLength: Keyword<number, "data">;
  maxProperties: Keyword<number, "data">;
  maximum: Keyword<number, "data">;
  minContains: Keyword<number, "data">;
  minItems: Keyword<number, "data">;
  minLength: Keyword<number, "data">;
  minProperties: Keyword<number, "data">;
  minimum: Keyword<number, "data">;
  multipleOf: Keyword<number, "data">;
  pattern: Keyword<string, "data">;
  required: Keyword<string[], "data">;
  type: Keyword<TypeName | TypeName[], "data">;
  uniqueItems: Keyword<boolean, "data">;
  default: Keyword<Json, "data">;
  deprecated: Keyword<boolean, "data">;
  description: Keyword<string, "data">;
  examples: Keyword<Json[], "data">;
  readOnly: Keyword<boolean, "data">;
  title: Keyword<string, "data">;
  writeOnly: Keyword<boolean, "data">;
  contentEncoding: Keyword<string, "data">;
  contentMediaType: Keyword<string, "data">;
  contentSchema: Keyword<Json, "unappliedSchema">;
  format: Keyword<string, "data">;
};
