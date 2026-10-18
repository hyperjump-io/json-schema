import { SchemaRegistry } from "../schema-registry.js";
import { v1Dialect } from "../v1/index.js";
import { addVocabulary } from "../keywords/vocabulary.js";
import anchorKeyword from "../keywords/draft-2019-09/anchor.js";
import recursiveAnchorKeyword from "../keywords/draft-2019-09/recursiveAnchor.js";
import recursiveRefKeyword from "../keywords/draft-2019-09/recursiveRef.js";
import itemsKeyword from "../keywords/draft-04/items.js";
import additionalItemsKeyword from "../keywords/draft-04/additionalItems.js";
import metaSchema from "./schema.schema.json" with { type: "json" };
import coreMetaSchema from "./meta/core.schema.json" with { type: "json" };
import applicatorMetaSchema from "./meta/applicator.schema.json" with { type: "json" };
import validationMetaSchema from "./meta/validation.schema.json" with { type: "json" };
import metaDataMetaSchema from "./meta/meta-data.schema.json" with { type: "json" };
import formatMetaSchema from "./meta/format.schema.json" with { type: "json" };
import contentMetaSchema from "./meta/content.schema.json" with { type: "json" };

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Vocabulary } from "../keywords/vocabulary.js"
 * @import * as API from "./index.d.ts"
 */

/** @type API.draft201909DialectUri */
export const draft201909DialectUri = "https://json-schema.org/draft/2019-09/schema";

/** The formats JSON Schema defines are the same in 2019-09 and v1 */
const formats = /** @type Record<string, string> */ (v1Dialect.formats);

/** @type Record<string, Vocabulary> */
const vocabularies = {
  "https://json-schema.org/draft/2019-09/vocab/core": {
    keywords: {
      $anchor: anchorKeyword.uri,
      $comment: "https://json-schema.org/keyword/comment",
      $defs: "https://json-schema.org/keyword/definitions",
      $id: "https://json-schema.org/keyword/id",
      $recursiveAnchor: recursiveAnchorKeyword.uri,
      $recursiveRef: recursiveRefKeyword.uri,
      $ref: "https://json-schema.org/keyword/ref",
      $vocabulary: "https://json-schema.org/keyword/vocabulary"
    }
  },
  "https://json-schema.org/draft/2019-09/vocab/applicator": {
    keywords: {
      additionalItems: additionalItemsKeyword.uri,
      additionalProperties: "https://json-schema.org/keyword/additionalProperties",
      allOf: "https://json-schema.org/keyword/allOf",
      anyOf: "https://json-schema.org/keyword/anyOf",
      contains: "https://json-schema.org/keyword/contains",
      dependentSchemas: "https://json-schema.org/keyword/dependentSchemas",
      if: "https://json-schema.org/keyword/if",
      then: "https://json-schema.org/keyword/then",
      else: "https://json-schema.org/keyword/else",
      items: itemsKeyword.uri,
      not: "https://json-schema.org/keyword/not",
      oneOf: "https://json-schema.org/keyword/oneOf",
      patternProperties: "https://json-schema.org/keyword/patternProperties",
      properties: "https://json-schema.org/keyword/properties",
      propertyNames: "https://json-schema.org/keyword/propertyNames",
      unevaluatedItems: "https://json-schema.org/keyword/unevaluatedItems",
      unevaluatedProperties: "https://json-schema.org/keyword/unevaluatedProperties"
    }
  },
  "https://json-schema.org/draft/2019-09/vocab/validation": {
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
  "https://json-schema.org/draft/2019-09/vocab/meta-data": {
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
  "https://json-schema.org/draft/2019-09/vocab/format": {
    keywords: { format: "https://json-schema.org/keyword/format" },
    formats: formats
  },
  "https://json-schema.org/draft/2019-09/vocab/content": {
    keywords: {
      contentEncoding: "https://json-schema.org/keyword/contentEncoding",
      contentMediaType: "https://json-schema.org/keyword/contentMediaType",
      contentSchema: "https://json-schema.org/keyword/contentSchema"
    }
  }
};

/** @type API.draft201909Dialect */
export const draft201909Dialect = {
  uri: draft201909DialectUri,
  keywords: Object.assign({}, ...Object.values(vocabularies).map((vocabulary) => vocabulary.keywords)),
  unknownKeywords: "annotation",
  formats: formats,
  assertFormats: false
};

/**
 * The 2019-09 meta-schemas, so they don't have to be retrieved to build a
 * dialect that extends 2019-09 or to compile a schema that references them.
 * One registry is shared by every JsonSchema. Each identifies its entries
 * itself.
 */
const metaSchemas = new SchemaRegistry();

// TypeScript infers types for the JSON that aren't assignable to Json
for (const schema of /** @type Json[] */ (/** @type unknown */ ([
  metaSchema,
  coreMetaSchema,
  applicatorMetaSchema,
  validationMetaSchema,
  metaDataMetaSchema,
  formatMetaSchema,
  contentMetaSchema
]))) {
  metaSchemas.add(schema);
}

/** @type API.addDraft201909 */
export const addDraft201909 = (jsonSchema) => {
  jsonSchema.addKeyword(anchorKeyword);
  jsonSchema.addKeyword(recursiveAnchorKeyword);
  jsonSchema.addKeyword(recursiveRefKeyword);
  jsonSchema.addKeyword(itemsKeyword);
  jsonSchema.addKeyword(additionalItemsKeyword);
  for (const uri in vocabularies) {
    addVocabulary(jsonSchema, uri, vocabularies[uri]);
  }

  jsonSchema.addDialect(draft201909Dialect);
  jsonSchema.addRegistry(metaSchemas);
};
