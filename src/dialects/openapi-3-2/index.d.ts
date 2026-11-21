import type { Json } from "@hyperjump/browser";
import type { SchemaOf } from "../../dialect.d.ts";
import type { Keyword } from "../../keyword.d.ts";
import type { Format } from "../../format.d.ts";
import type { Draft202012Keywords } from "../draft-2020-12/index.d.ts";

/** The URI of OpenAPI 3.2's vocabulary */
export const openApi32VocabularyUri: "https://spec.openapis.org/oas/3.2/vocab/base";

/**
 * OpenAPI 3.2's vocabulary: `discriminator`, `example`, `externalDocs`,
 * and `xml`, which are annotations, and the `int32` and `password` formats. Add it to the `vocabularies` config by
 * {@link openApi32VocabularyUri}, with the 2020-12 dialect in `dialects`.
 *
 * OpenAPI 3.2's dialects are defined by their meta-schemas, like
 * `https://spec.openapis.org/oas/3.2/dialect/2026-02-26`, with `$vocabulary`. A schema whose `$schema` is
 * one gets 2020-12's keywords and these. The meta-schema has to be in a
 * registry: OpenAPI serves its meta-schemas as `application/octet-stream`,
 * so they can't be retrieved. It lists this
 * vocabulary as optional, so without it in the config, these keywords are
 * unknown keywords.
 *
 * ```ts
 * const config = jsonSchemaConfig({
 *   dialects: [draft202012Dialect],
 *   vocabularies: { [openApi32VocabularyUri]: openApi32Vocabulary },
 *   registry: new SchemaRegistry([{ schema: downloadedMetaSchema }])
 * });
 * ```
 */
export const openApi32Vocabulary: { keywords: OpenApi32VocabularyKeywords; formats: Record<string, Format> };

/** The URIs OpenAPI publishes its 3.2 dialect meta-schemas at */
export type OpenApi32DialectUri = "https://spec.openapis.org/oas/3.2/dialect/2025-09-17" | "https://spec.openapis.org/oas/3.2/dialect/2026-02-26";

/**
 * The type of an OpenAPI 3.2 Schema Object, for checking schemas written in
 * TypeScript. Unknown keywords are annotations, so any keyword is allowed,
 * but the values of the dialect's keywords are checked. Add the types of
 * custom keywords by name.
 *
 * ```ts
 * const schema = {
 *   type: "object",
 *   discriminator: { propertyName: "kind" }
 * } satisfies OpenApi32Schema;
 * ```
 */
export type OpenApi32Schema<Extension extends Record<string, Keyword<any, any, any>> = {}> = SchemaOf<Draft202012Keywords & OpenApi32VocabularyKeywords & Extension, OpenApi32DialectUri, "annotation">;

/** The types of the vocabulary's keywords, by name */
export type OpenApi32VocabularyKeywords = {
  discriminator: Keyword<Discriminator, "data">;
  example: Keyword<Json, "data">;
  externalDocs: Keyword<ExternalDocs, "data">;
  xml: Keyword<Xml, "data">;
};

/** A Discriminator Object, the value of `discriminator` */
export type Discriminator = {
  propertyName: string;
  mapping?: Record<string, string>;
  defaultMapping?: string;
};

/** An External Documentation Object, the value of `externalDocs` */
export type ExternalDocs = {
  url: string;
  description?: string;
};

/** An XML Object, the value of `xml` */
export type Xml = {
  nodeType?: "element" | "attribute" | "text" | "cdata" | "none";
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
};
