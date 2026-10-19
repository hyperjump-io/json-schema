import { SchemaRegistry } from "../schema-registry.js";
import { v1Dialect } from "../v1/index.js";
import { addVocabulary } from "../keywords/vocabulary.js";
import dynamicRefKeyword from "../keywords/draft-2020-12/dynamicRef.js";
import metaSchema from "./schema.schema.json" with { type: "json" };
import coreMetaSchema from "./meta/core.schema.json" with { type: "json" };
import applicatorMetaSchema from "./meta/applicator.schema.json" with { type: "json" };
import unevaluatedMetaSchema from "./meta/unevaluated.schema.json" with { type: "json" };
import validationMetaSchema from "./meta/validation.schema.json" with { type: "json" };
import metaDataMetaSchema from "./meta/meta-data.schema.json" with { type: "json" };
import formatAnnotationMetaSchema from "./meta/format-annotation.schema.json" with { type: "json" };
import formatAssertionMetaSchema from "./meta/format-assertion.schema.json" with { type: "json" };
import contentMetaSchema from "./meta/content.schema.json" with { type: "json" };

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Vocabulary } from "../keywords/vocabulary.js"
 * @import * as API from "./index.d.ts"
 */

/** @type API.draft202012DialectUri */
export const draft202012DialectUri = "https://json-schema.org/draft/2020-12/schema";

/** The formats JSON Schema defines are the same in 2020-12 and v1 */
const formats = /** @type Record<string, string> */ (v1Dialect.formats);

/** @type Record<string, Vocabulary> */
const vocabularies = {
  "https://json-schema.org/draft/2020-12/vocab/core": {
    keywords: {
      $anchor: "https://json-schema.org/keyword/anchor",
      $comment: "https://json-schema.org/keyword/comment",
      $defs: "https://json-schema.org/keyword/definitions",
      $dynamicAnchor: "https://json-schema.org/keyword/dynamicAnchor",
      $dynamicRef: dynamicRefKeyword.uri,
      $id: "https://json-schema.org/keyword/id",
      $ref: "https://json-schema.org/keyword/ref",
      $vocabulary: "https://json-schema.org/keyword/vocabulary"
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/applicator": {
    keywords: {
      additionalProperties: "https://json-schema.org/keyword/additionalProperties",
      allOf: "https://json-schema.org/keyword/allOf",
      anyOf: "https://json-schema.org/keyword/anyOf",
      contains: "https://json-schema.org/keyword/contains",
      dependentSchemas: "https://json-schema.org/keyword/dependentSchemas",
      if: "https://json-schema.org/keyword/if",
      then: "https://json-schema.org/keyword/then",
      else: "https://json-schema.org/keyword/else",
      items: "https://json-schema.org/keyword/items",
      not: "https://json-schema.org/keyword/not",
      oneOf: "https://json-schema.org/keyword/oneOf",
      patternProperties: "https://json-schema.org/keyword/patternProperties",
      prefixItems: "https://json-schema.org/keyword/prefixItems",
      properties: "https://json-schema.org/keyword/properties",
      propertyNames: "https://json-schema.org/keyword/propertyNames"
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": {
    keywords: {
      unevaluatedItems: "https://json-schema.org/keyword/unevaluatedItems",
      unevaluatedProperties: "https://json-schema.org/keyword/unevaluatedProperties"
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/validation": {
    keywords: {
      const: "https://json-schema.org/keyword/const",
      dependentRequired: "https://json-schema.org/keyword/dependentRequired",
      enum: "https://json-schema.org/keyword/enum",
      exclusiveMaximum: "https://json-schema.org/keyword/exclusiveMaximum",
      exclusiveMinimum: "https://json-schema.org/keyword/exclusiveMinimum",
      maxContains: "https://json-schema.org/keyword/maxContains",
      maxItems: "https://json-schema.org/keyword/maxItems",
      maxLength: "https://json-schema.org/keyword/maxLength",
      maxProperties: "https://json-schema.org/keyword/maxProperties",
      maximum: "https://json-schema.org/keyword/maximum",
      minContains: "https://json-schema.org/keyword/minContains",
      minItems: "https://json-schema.org/keyword/minItems",
      minLength: "https://json-schema.org/keyword/minLength",
      minProperties: "https://json-schema.org/keyword/minProperties",
      minimum: "https://json-schema.org/keyword/minimum",
      multipleOf: "https://json-schema.org/keyword/multipleOf",
      pattern: "https://json-schema.org/keyword/pattern",
      required: "https://json-schema.org/keyword/required",
      type: "https://json-schema.org/keyword/type",
      uniqueItems: "https://json-schema.org/keyword/uniqueItems"
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/meta-data": {
    keywords: {
      default: "https://json-schema.org/keyword/default",
      deprecated: "https://json-schema.org/keyword/deprecated",
      description: "https://json-schema.org/keyword/description",
      examples: "https://json-schema.org/keyword/examples",
      readOnly: "https://json-schema.org/keyword/readOnly",
      title: "https://json-schema.org/keyword/title",
      writeOnly: "https://json-schema.org/keyword/writeOnly"
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": {
    keywords: { format: "https://json-schema.org/keyword/format" },
    formats: formats
  },
  "https://json-schema.org/draft/2020-12/vocab/format-assertion": {
    keywords: { format: "https://json-schema.org/keyword/format" },
    formats: formats,
    assertFormats: true
  },
  "https://json-schema.org/draft/2020-12/vocab/content": {
    keywords: {
      contentEncoding: "https://json-schema.org/keyword/contentEncoding",
      contentMediaType: "https://json-schema.org/keyword/contentMediaType",
      contentSchema: "https://json-schema.org/keyword/contentSchema"
    }
  }
};

/** The vocabularies the 2020-12 meta-schema lists */
const dialectVocabularies = [
  "https://json-schema.org/draft/2020-12/vocab/core",
  "https://json-schema.org/draft/2020-12/vocab/applicator",
  "https://json-schema.org/draft/2020-12/vocab/unevaluated",
  "https://json-schema.org/draft/2020-12/vocab/validation",
  "https://json-schema.org/draft/2020-12/vocab/meta-data",
  "https://json-schema.org/draft/2020-12/vocab/format-annotation",
  "https://json-schema.org/draft/2020-12/vocab/content"
];

/** @type API.draft202012Dialect */
export const draft202012Dialect = {
  uri: draft202012DialectUri,
  keywords: Object.assign({}, ...dialectVocabularies.map((uri) => vocabularies[uri].keywords)),
  unknownKeywords: "annotation",
  formats: formats,
  assertFormats: false
};

/**
 * The 2020-12 meta-schemas, so they don't have to be retrieved to build a
 * dialect that extends 2020-12 or to compile a schema that references them.
 * One registry is shared by every JsonSchema. Each identifies its entries
 * itself.
 */
// TypeScript infers types for the JSON that aren't assignable to Json
const metaSchemas = new SchemaRegistry((/** @type Json[] */ (/** @type unknown */ ([
  metaSchema,
  coreMetaSchema,
  applicatorMetaSchema,
  unevaluatedMetaSchema,
  validationMetaSchema,
  metaDataMetaSchema,
  formatAnnotationMetaSchema,
  formatAssertionMetaSchema,
  contentMetaSchema
]))).map((schema) => ({ schema })));

/** @type API.addDraft202012 */
export const addDraft202012 = (jsonSchema) => {
  jsonSchema.addKeyword(dynamicRefKeyword);
  for (const uri in vocabularies) {
    addVocabulary(jsonSchema, uri, vocabularies[uri]);
  }

  jsonSchema.addDialect(draft202012Dialect);
  jsonSchema.addRegistry(metaSchemas);
};
