import type { Json } from "@hyperjump/browser";
import type { DialectConfig, SchemaOf } from "../../dialect.d.ts";
import type { Keyword } from "../../keyword.d.ts";
import type { Expression } from "../../kernel/kernel.d.ts";

/**
 * The URI of the OpenAPI 3.0 dialect. OpenAPI doesn't publish one for 3.0,
 * so this is the one v1 of this package used.
 */
export const openApi30DialectUri: "https://spec.openapis.org/oas/3.0/dialect";

/**
 * The dialect of Schema Objects in OpenAPI 3.0: a subset of draft-04 with
 * `nullable`, `discriminator`, `example`, `externalDocs`, and `xml`. `type`
 * is one type, and `nullable: true` allows `null` too. `$ref` replaces the
 * whole schema, so its siblings are ignored. Unknown keywords are errors,
 * except ones starting with `x-`, which are annotations. `format` is an
 * annotation by default. Set the `validateFormats` config to validate it.
 *
 * Schema Objects don't have `$schema`, so a schema in this dialect needs it
 * from somewhere else, like the `dialectUri` of a registry entry.
 */
export const openApi30Dialect: DialectConfig<OpenApi30Keywords, typeof openApi30DialectUri, "error">;

/**
 * The type of an OpenAPI 3.0 Schema Object, for checking schemas written in
 * TypeScript. Unknown keywords are errors, except ones starting with `x-`.
 * Add the types of custom keywords by name.
 *
 * ```ts
 * const schema = {
 *   type: "string",
 *   nullable: true
 * } satisfies OpenApi30Schema;
 * ```
 */
export type OpenApi30Schema<Extension extends Record<string, Keyword<any, any, any>> = {}> = SchemaOf<OpenApi30Keywords & Extension, typeof openApi30DialectUri, "error">;

/**
 * The types of the OpenAPI 3.0 dialect's keywords, by name, for
 * {@link SchemaOf}
 */
export type OpenApi30Keywords = {
  additionalProperties: Keyword<Expression, "schema">;
  allOf: Keyword<Expression[], { array: "schema" }>;
  anyOf: Keyword<Expression[], { array: "schema" }>;
  default: Keyword<Json, "data">;
  deprecated: Keyword<boolean, "data">;
  description: Keyword<string, "data">;
  discriminator: Keyword<Discriminator, "data">;
  enum: Keyword<Json[], "data">;
  example: Keyword<Json, "data">;
  exclusiveMaximum: Keyword<boolean, "data">;
  exclusiveMinimum: Keyword<boolean, "data">;
  externalDocs: Keyword<ExternalDocs, "data">;
  format: Keyword<string, "data">;
  items: Keyword<Expression, "schema">;
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
  nullable: Keyword<boolean, "data">;
  oneOf: Keyword<Expression[], { array: "schema" }>;
  pattern: Keyword<string, "data">;
  properties: Keyword<[string, Expression][], { map: "schema" }>;
  readOnly: Keyword<boolean, "data">;
  $ref: Keyword<string, "data">;
  required: Keyword<string[], "data">;
  title: Keyword<string, "data">;
  type: Keyword<"array" | "boolean" | "integer" | "number" | "object" | "string", "data", { nullable: boolean | undefined }>;
  uniqueItems: Keyword<boolean, "data">;
  writeOnly: Keyword<boolean, "data">;
  xml: Keyword<Xml, "data">;
};

/** A Discriminator Object, the value of `discriminator` */
export type Discriminator = {
  propertyName: string;
  mapping?: Record<string, string>;
};

/** An External Documentation Object, the value of `externalDocs` */
export type ExternalDocs = {
  url: string;
  description?: string;
};

/** An XML Object, the value of `xml` */
export type Xml = {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
};
