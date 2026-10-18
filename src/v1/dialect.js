import idKeyword from "../keywords/id.js";
import anchorKeyword from "../keywords/anchor.js";
import commentKeyword from "../keywords/comment.js";
import dynamicAnchorKeyword from "../keywords/dynamicAnchor.js";
import typeKeyword from "../keywords/type.js";
import constKeyword from "../keywords/const.js";
import enumKeyword from "../keywords/enum.js";
import maximumKeyword from "../keywords/maximum.js";
import minimumKeyword from "../keywords/minimum.js";
import exclusiveMaximumKeyword from "../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../keywords/exclusiveMinimum.js";
import multipleOfKeyword from "../keywords/multipleOf.js";
import maxLengthKeyword from "../keywords/maxLength.js";
import minLengthKeyword from "../keywords/minLength.js";
import patternKeyword from "../keywords/pattern.js";
import maxItemsKeyword from "../keywords/maxItems.js";
import minItemsKeyword from "../keywords/minItems.js";
import uniqueItemsKeyword from "../keywords/uniqueItems.js";
import maxPropertiesKeyword from "../keywords/maxProperties.js";
import minPropertiesKeyword from "../keywords/minProperties.js";
import requiredKeyword from "../keywords/required.js";
import dependentRequiredKeyword from "../keywords/dependentRequired.js";
import requireAllExceptKeyword from "../keywords/requireAllExcept.js";
import definitionsKeyword from "../keywords/definitions.js";
import propertiesKeyword from "../keywords/properties.js";
import patternPropertiesKeyword from "../keywords/patternProperties.js";
import additionalPropertiesKeyword from "../keywords/additionalProperties.js";
import propertyNamesKeyword from "../keywords/propertyNames.js";
import dependentSchemasKeyword from "../keywords/dependentSchemas.js";
import propertyDependenciesKeyword from "../keywords/propertyDependencies.js";
import prefixItemsKeyword from "../keywords/prefixItems.js";
import itemsKeyword from "../keywords/items.js";
import containsKeyword from "../keywords/contains.js";
import minContainsKeyword from "../keywords/minContains.js";
import maxContainsKeyword from "../keywords/maxContains.js";
import allOfKeyword from "../keywords/allOf.js";
import anyOfKeyword from "../keywords/anyOf.js";
import oneOfKeyword from "../keywords/oneOf.js";
import notKeyword from "../keywords/not.js";
import conditionalKeyword from "../keywords/conditional.js";
import itemPatternKeyword from "../keywords/itemPattern.js";
import ifKeyword from "../keywords/if.js";
import thenKeyword from "../keywords/then.js";
import elseKeyword from "../keywords/else.js";
import refKeyword from "../keywords/ref.js";
import dynamicRefKeyword from "../keywords/dynamicRef.js";
import unevaluatedPropertiesKeyword from "../keywords/unevaluatedProperties.js";
import unevaluatedItemsKeyword from "../keywords/unevaluatedItems.js";
import titleKeyword from "../keywords/title.js";
import descriptionKeyword from "../keywords/description.js";
import defaultKeyword from "../keywords/default.js";
import deprecatedKeyword from "../keywords/deprecated.js";
import examplesKeyword from "../keywords/examples.js";
import readOnlyKeyword from "../keywords/readOnly.js";
import writeOnlyKeyword from "../keywords/writeOnly.js";
import contentEncodingKeyword from "../keywords/contentEncoding.js";
import contentMediaTypeKeyword from "../keywords/contentMediaType.js";
import contentSchemaKeyword from "../keywords/contentSchema.js";
import formatKeyword from "../keywords/format.js";
import { addLiteFormats } from "../formats/lite.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import * as API from "./index.d.ts"
 */

/** @type API.v1DialectUri */
export const v1DialectUri = "https://json-schema.org/v1";

/** @type API.v1Dialect */
export const v1Dialect = {
  uri: v1DialectUri,
  keywords: {
    // Core
    $anchor: "https://json-schema.org/keyword/anchor",
    $comment: "https://json-schema.org/keyword/comment",
    $defs: "https://json-schema.org/keyword/definitions",
    $dynamicAnchor: "https://json-schema.org/keyword/dynamicAnchor",
    $dynamicRef: "https://json-schema.org/keyword/dynamicRef",
    $id: "https://json-schema.org/keyword/id",
    $ref: "https://json-schema.org/keyword/ref",

    // Applicator
    additionalProperties: "https://json-schema.org/keyword/additionalProperties",
    allOf: "https://json-schema.org/keyword/allOf",
    anyOf: "https://json-schema.org/keyword/anyOf",
    contains: "https://json-schema.org/keyword/contains",
    minContains: "https://json-schema.org/keyword/minContains",
    maxContains: "https://json-schema.org/keyword/maxContains",
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
    propertyDependencies: "https://json-schema.org/keyword/propertyDependencies",
    propertyNames: "https://json-schema.org/keyword/propertyNames",

    // Validation
    const: "https://json-schema.org/keyword/const",
    dependentRequired: "https://json-schema.org/keyword/dependentRequired",
    enum: "https://json-schema.org/keyword/enum",
    exclusiveMaximum: "https://json-schema.org/keyword/exclusiveMaximum",
    exclusiveMinimum: "https://json-schema.org/keyword/exclusiveMinimum",
    maxItems: "https://json-schema.org/keyword/maxItems",
    maxLength: "https://json-schema.org/keyword/maxLength",
    maxProperties: "https://json-schema.org/keyword/maxProperties",
    maximum: "https://json-schema.org/keyword/maximum",
    minItems: "https://json-schema.org/keyword/minItems",
    minLength: "https://json-schema.org/keyword/minLength",
    minProperties: "https://json-schema.org/keyword/minProperties",
    minimum: "https://json-schema.org/keyword/minimum",
    multipleOf: "https://json-schema.org/keyword/multipleOf",
    pattern: "https://json-schema.org/keyword/pattern",
    required: "https://json-schema.org/keyword/required",
    type: "https://json-schema.org/keyword/type",
    uniqueItems: "https://json-schema.org/keyword/uniqueItems",

    // Meta-data
    default: "https://json-schema.org/keyword/default",
    deprecated: "https://json-schema.org/keyword/deprecated",
    description: "https://json-schema.org/keyword/description",
    examples: "https://json-schema.org/keyword/examples",
    readOnly: "https://json-schema.org/keyword/readOnly",
    title: "https://json-schema.org/keyword/title",
    writeOnly: "https://json-schema.org/keyword/writeOnly",

    // Format
    format: "https://json-schema.org/keyword/format",

    // Content
    contentEncoding: "https://json-schema.org/keyword/contentEncoding",
    contentMediaType: "https://json-schema.org/keyword/contentMediaType",
    contentSchema: "https://json-schema.org/keyword/contentSchema",

    // Unevaluated
    unevaluatedItems: "https://json-schema.org/keyword/unevaluatedItems",
    unevaluatedProperties: "https://json-schema.org/keyword/unevaluatedProperties"
  },
  unknownKeywords: "error",
  formats: {
    "date-time": "https://json-schema.org/format/date-time",
    "date": "https://json-schema.org/format/date",
    "time": "https://json-schema.org/format/time",
    "duration": "https://json-schema.org/format/duration",
    "email": "https://json-schema.org/format/email",
    "idn-email": "https://json-schema.org/format/idn-email",
    "hostname": "https://json-schema.org/format/hostname",
    "idn-hostname": "https://json-schema.org/format/idn-hostname",
    "ipv4": "https://json-schema.org/format/ipv4",
    "ipv6": "https://json-schema.org/format/ipv6",
    "uri": "https://json-schema.org/format/uri",
    "uri-reference": "https://json-schema.org/format/uri-reference",
    "iri": "https://json-schema.org/format/iri",
    "iri-reference": "https://json-schema.org/format/iri-reference",
    "uuid": "https://json-schema.org/format/uuid",
    "uri-template": "https://json-schema.org/format/uri-template",
    "json-pointer": "https://json-schema.org/format/json-pointer",
    "relative-json-pointer": "https://json-schema.org/format/relative-json-pointer",
    "regex": "https://json-schema.org/format/regex"
  },
  assertFormats: true
};

/**
 * Keywords that aren't full proposals yet. They're added with
 * `extendDialect` as a reminder that they aren't part of the dialect.
 */
const extensionKeywords = {
  conditional: "https://json-schema.org/keyword/conditional",
  itemPattern: "https://json-schema.org/keyword/itemPattern",
  requireAllExcept: "https://json-schema.org/keyword/requireAllExcept"
};

/** @type Keyword<any>[] */
const keywords = [
  idKeyword,
  anchorKeyword,
  commentKeyword,
  dynamicAnchorKeyword,
  typeKeyword,
  constKeyword,
  enumKeyword,
  maximumKeyword,
  minimumKeyword,
  exclusiveMaximumKeyword,
  exclusiveMinimumKeyword,
  multipleOfKeyword,
  maxLengthKeyword,
  minLengthKeyword,
  patternKeyword,
  maxItemsKeyword,
  minItemsKeyword,
  uniqueItemsKeyword,
  maxPropertiesKeyword,
  minPropertiesKeyword,
  requiredKeyword,
  dependentRequiredKeyword,
  requireAllExceptKeyword,
  definitionsKeyword,
  propertiesKeyword,
  patternPropertiesKeyword,
  additionalPropertiesKeyword,
  propertyNamesKeyword,
  dependentSchemasKeyword,
  propertyDependenciesKeyword,
  prefixItemsKeyword,
  itemsKeyword,
  containsKeyword,
  minContainsKeyword,
  maxContainsKeyword,
  allOfKeyword,
  anyOfKeyword,
  oneOfKeyword,
  notKeyword,
  conditionalKeyword,
  itemPatternKeyword,
  ifKeyword,
  thenKeyword,
  elseKeyword,
  refKeyword,
  dynamicRefKeyword,
  unevaluatedPropertiesKeyword,
  unevaluatedItemsKeyword,
  titleKeyword,
  descriptionKeyword,
  defaultKeyword,
  deprecatedKeyword,
  examplesKeyword,
  readOnlyKeyword,
  writeOnlyKeyword,
  contentEncodingKeyword,
  contentMediaTypeKeyword,
  contentSchemaKeyword,
  formatKeyword
];

/**
 * Add the v1 keywords, formats, and dialect. Every `JsonSchema` has them,
 * because keyword schemas are written in v1.
 *
 * @type (jsonSchema: JsonSchema) => void
 */
export const addV1 = (jsonSchema) => {
  for (const keyword of keywords) {
    jsonSchema.addKeyword(keyword);
  }

  addLiteFormats(jsonSchema);

  jsonSchema.addDialect(v1Dialect);
  jsonSchema.extendDialect(v1DialectUri, { keywords: extensionKeywords });
};
