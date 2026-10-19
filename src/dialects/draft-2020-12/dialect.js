import anchorKeyword from "../../keywords/anchor.js";
import commentKeyword from "../../keywords/comment.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dynamicAnchorKeyword from "../../keywords/dynamicAnchor.js";
import dynamicRefKeyword from "../../keywords/draft-2020-12/dynamicRef.js";
import idKeyword from "../../keywords/id.js";
import refKeyword from "../../keywords/ref.js";
import additionalPropertiesKeyword from "../../keywords/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import containsKeyword from "../../keywords/contains.js";
import dependentSchemasKeyword from "../../keywords/dependentSchemas.js";
import ifKeyword from "../../keywords/if.js";
import thenKeyword from "../../keywords/then.js";
import elseKeyword from "../../keywords/else.js";
import itemsKeyword from "../../keywords/items.js";
import notKeyword from "../../keywords/not.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternPropertiesKeyword from "../../keywords/patternProperties.js";
import prefixItemsKeyword from "../../keywords/prefixItems.js";
import propertiesKeyword from "../../keywords/properties.js";
import propertyNamesKeyword from "../../keywords/propertyNames.js";
import unevaluatedItemsKeyword from "../../keywords/unevaluatedItems.js";
import unevaluatedPropertiesKeyword from "../../keywords/unevaluatedProperties.js";
import constKeyword from "../../keywords/const.js";
import dependentRequiredKeyword from "../../keywords/dependentRequired.js";
import enumKeyword from "../../keywords/enum.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import maxContainsKeyword from "../../keywords/maxContains.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import maximumKeyword from "../../keywords/maximum.js";
import minContainsKeyword from "../../keywords/minContains.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import minimumKeyword from "../../keywords/minimum.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import patternKeyword from "../../keywords/pattern.js";
import requiredKeyword from "../../keywords/required.js";
import typeKeyword from "../../keywords/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import defaultKeyword from "../../keywords/default.js";
import deprecatedKeyword from "../../keywords/deprecated.js";
import descriptionKeyword from "../../keywords/description.js";
import examplesKeyword from "../../keywords/examples.js";
import readOnlyKeyword from "../../keywords/readOnly.js";
import titleKeyword from "../../keywords/title.js";
import writeOnlyKeyword from "../../keywords/writeOnly.js";
import formatKeyword from "../../keywords/format.js";
import contentEncodingKeyword from "../../keywords/contentEncoding.js";
import contentMediaTypeKeyword from "../../keywords/contentMediaType.js";
import contentSchemaKeyword from "../../keywords/contentSchema.js";
import { v1Dialect } from "../v1/index.js";
import vocabularyKeyword, { addVocabulary } from "../../keywords/vocabulary.js";
import { addPreset } from "../add-preset.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { Vocabulary } from "../../keywords/vocabulary.js"
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
 * The keyword definitions the dialect uses
 *
 * @type Keyword<any>[]
 */
const keywords = [
  anchorKeyword,
  commentKeyword,
  definitionsKeyword,
  dynamicAnchorKeyword,
  dynamicRefKeyword,
  idKeyword,
  refKeyword,
  vocabularyKeyword,
  additionalPropertiesKeyword,
  allOfKeyword,
  anyOfKeyword,
  containsKeyword,
  dependentSchemasKeyword,
  ifKeyword,
  thenKeyword,
  elseKeyword,
  itemsKeyword,
  notKeyword,
  oneOfKeyword,
  patternPropertiesKeyword,
  prefixItemsKeyword,
  propertiesKeyword,
  propertyNamesKeyword,
  unevaluatedItemsKeyword,
  unevaluatedPropertiesKeyword,
  constKeyword,
  dependentRequiredKeyword,
  enumKeyword,
  exclusiveMaximumKeyword,
  exclusiveMinimumKeyword,
  maxContainsKeyword,
  maxItemsKeyword,
  maxLengthKeyword,
  maxPropertiesKeyword,
  maximumKeyword,
  minContainsKeyword,
  minItemsKeyword,
  minLengthKeyword,
  minPropertiesKeyword,
  minimumKeyword,
  multipleOfKeyword,
  patternKeyword,
  requiredKeyword,
  typeKeyword,
  uniqueItemsKeyword,
  defaultKeyword,
  deprecatedKeyword,
  descriptionKeyword,
  examplesKeyword,
  readOnlyKeyword,
  titleKeyword,
  writeOnlyKeyword,
  formatKeyword,
  contentEncodingKeyword,
  contentMediaTypeKeyword,
  contentSchemaKeyword
];

/** @type API.addDraft202012 */
export const addDraft202012 = (jsonSchema) => {
  addPreset(jsonSchema, draft202012Dialect, { keywords });

  for (const uri in vocabularies) {
    addVocabulary(jsonSchema, uri, vocabularies[uri]);
  }
};
