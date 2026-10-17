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

/**
 * @import { Keyword } from "../keyword.d.ts"
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
  unknownKeywords: "error"
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
  requireAllExceptKeyword
];

/** @type API.addV1 */
export const addV1 = (jsonSchema) => {
  for (const keyword of keywords) {
    jsonSchema.addKeyword(keyword);
  }

  jsonSchema.addDialect(v1Dialect);
  jsonSchema.extendDialect(v1DialectUri, extensionKeywords);
};
