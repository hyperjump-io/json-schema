import type { Json } from "@hyperjump/browser/json";
import type { JsonSchema } from "../../json-schema.d.ts";
import type { DialectConfig, SchemaOf } from "../../dialect.d.ts";
import type { Keyword, Reference } from "../../keyword.d.ts";
import type { Expression, TypeName } from "../../kernel/kernel.d.ts";

/** The URI of the JSON Schema v1 dialect */
export const v1DialectUri: "https://json-schema.org/v1";

/**
 * The JSON Schema v1 dialect, with its keywords and formats, for the
 * `dialects` config. Unknown keywords are errors. Add custom keywords with
 * `extendDialect`. It also has `conditional`, `itemPattern`, and
 * `requireAllExcept`, which aren't full proposals yet.
 *
 * `format` validates by default, with the lite formats. Add the full formats
 * (`formats/full.js`) to the `formats` config for `hostname`,
 * `idn-hostname`, and `idn-email`.
 */
export const v1Dialect: DialectConfig;

/**
 * The type of a JSON Schema v1 schema, for checking schemas written in
 * TypeScript. It has the dialect's keywords, including
 * `conditional`, `itemPattern`, and `requireAllExcept`. Unknown keywords are
 * errors, except ones starting with `x-`. Add the types of custom keywords
 * by name.
 *
 * ```ts
 * const schema = {
 *   $schema: "https://json-schema.org/v1",
 *   type: "object",
 *   properties: {
 *     name: { type: "string", myKeyword: [true] }
 *   }
 * } satisfies V1Schema<{ myKeyword: typeof myKeyword }>;
 * ```
 *
 * `format` is any string, because formats only validate when they're
 * enabled.
 */
export type V1Schema<Extension extends Record<string, Keyword<any, any, any>> = {}> = SchemaOf<V1Keywords & Extension, typeof v1DialectUri, "error">;

/**
 * The types of the v1 dialect's keywords, by name, for {@link SchemaOf}
 */
export type V1Keywords = {
  // Core
  $anchor: Keyword<string, "data">;
  $comment: Keyword<string, "data">;
  $defs: Keyword<[string, Expression][], { map: "schema" }>;
  $dynamicAnchor: Keyword<string, "data">;
  $dynamicRef: Keyword<string, "data">;
  $id: Keyword<string, "data">;
  $ref: Keyword<Reference, "reference">;

  // Applicator
  additionalProperties: Keyword<Expression, "schema">;
  allOf: Keyword<Expression[], { array: "schema" }>;
  anyOf: Keyword<Expression[], { array: "schema" }>;
  contains: Keyword<Expression, "schema">;
  minContains: Keyword<number, "data">;
  maxContains: Keyword<number, "data">;
  dependentSchemas: Keyword<[string, Expression][], { map: "schema" }>;
  if: Keyword<Expression, "schema">;
  then: Keyword<Expression, "schema">;
  else: Keyword<Expression, "schema">;
  items: Keyword<Expression, "schema">;
  not: Keyword<Expression, "schema">;
  oneOf: Keyword<Expression[], { array: "schema" }>;
  patternProperties: Keyword<[string, Expression][], { map: "schema" }>;
  prefixItems: Keyword<Expression[], { array: "schema" }>;
  properties: Keyword<[string, Expression][], { map: "schema" }>;
  propertyDependencies: Keyword<[string, [string, Expression][]][], { map: { map: "schema" } }>;
  propertyNames: Keyword<Expression, "schema">;

  // Validation
  const: Keyword<Json, "data">;
  dependentRequired: Keyword<Record<string, string[]>, "data">;
  enum: Keyword<Json[], "data">;
  exclusiveMaximum: Keyword<number, "data">;
  exclusiveMinimum: Keyword<number, "data">;
  maxItems: Keyword<number, "data">;
  maxLength: Keyword<number, "data">;
  maxProperties: Keyword<number, "data">;
  maximum: Keyword<number, "data">;
  minItems: Keyword<number, "data">;
  minLength: Keyword<number, "data">;
  minProperties: Keyword<number, "data">;
  minimum: Keyword<number, "data">;
  multipleOf: Keyword<number, "data">;
  pattern: Keyword<string, "data">;
  required: Keyword<string[], "data">;
  type: Keyword<TypeName | TypeName[], "data">;
  uniqueItems: Keyword<boolean, "data">;

  // Meta-data
  default: Keyword<Json, "data">;
  deprecated: Keyword<boolean, "data">;
  description: Keyword<string, "data">;
  examples: Keyword<Json[], "data">;
  readOnly: Keyword<boolean, "data">;
  title: Keyword<string, "data">;
  writeOnly: Keyword<boolean, "data">;

  // Format
  format: Keyword<string, "data">;

  // Content
  contentEncoding: Keyword<string, "data">;
  contentMediaType: Keyword<string, "data">;
  contentSchema: Keyword<Json, "unappliedSchema">;

  // Unevaluated
  unevaluatedItems: Keyword<Expression, "schema">;
  unevaluatedProperties: Keyword<Expression, "schema">;

  // Not full proposals yet
  conditional: Keyword<(Expression | Expression[])[], { array: ["schema", { array: "schema" }] }>;
  itemPattern: Keyword<ItemPatternRule[], ItemPatternShape>;
  requireAllExcept: Keyword<string[], "data">;
};

type ItemPatternShape = { array: ("schema" | "data" | ItemPatternShape)[] };
type ItemPatternRule = Expression | "*" | "+" | "?" | "|" | ItemPatternRule[];
