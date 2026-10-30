import anchorKeyword from "../../keywords/anchor.js";
import commentKeyword from "../../keywords/comment.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dynamicAnchorKeyword from "../../keywords/dynamicAnchor.js";
import dynamicRefKeyword from "../../keywords/dynamicRef.js";
import idKeyword from "../../keywords/id.js";
import refKeyword from "../../keywords/ref.js";
import additionalPropertiesKeyword from "../../keywords/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import containsKeyword from "../../keywords/contains.js";
import minContainsKeyword from "../../keywords/minContains.js";
import maxContainsKeyword from "../../keywords/maxContains.js";
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
import propertyDependenciesKeyword from "../../keywords/propertyDependencies.js";
import propertyNamesKeyword from "../../keywords/propertyNames.js";
import constKeyword from "../../keywords/const.js";
import dependentRequiredKeyword from "../../keywords/dependentRequired.js";
import enumKeyword from "../../keywords/enum.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import maximumKeyword from "../../keywords/maximum.js";
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
import unevaluatedItemsKeyword from "../../keywords/unevaluatedItems.js";
import unevaluatedPropertiesKeyword from "../../keywords/unevaluatedProperties.js";
import conditionalKeyword from "../../keywords/conditional.js";
import itemPatternKeyword from "../../keywords/itemPattern.js";
import requireAllExceptKeyword from "../../keywords/requireAllExcept.js";
import dateTimeFormat from "../../formats/date-time.js";
import dateFormat from "../../formats/date.js";
import timeFormat from "../../formats/time.js";
import durationFormat from "../../formats/duration.js";
import emailFormat from "../../formats/email.js";
import ipv4Format from "../../formats/ipv4.js";
import ipv6Format from "../../formats/ipv6.js";
import uriFormat from "../../formats/uri.js";
import uriReferenceFormat from "../../formats/uri-reference.js";
import iriFormat from "../../formats/iri.js";
import iriReferenceFormat from "../../formats/iri-reference.js";
import uuidFormat from "../../formats/uuid.js";
import uriTemplateFormat from "../../formats/uri-template.js";
import jsonPointerFormat from "../../formats/json-pointer.js";
import relativeJsonPointerFormat from "../../formats/relative-json-pointer.js";
import regexFormat from "../../formats/regex.js";

/**
 * @import * as API from "./index.d.ts"
 */

/** @type API.v1DialectUri */
export const v1DialectUri = "https://json-schema.org/v1";

/** @type API.v1Dialect */
export const v1Dialect = {
  uri: v1DialectUri,
  keywords: {
    // Core
    $anchor: anchorKeyword,
    $comment: commentKeyword,
    $defs: definitionsKeyword,
    $dynamicAnchor: dynamicAnchorKeyword,
    $dynamicRef: dynamicRefKeyword,
    $id: idKeyword,
    $ref: refKeyword,

    // Applicator
    additionalProperties: additionalPropertiesKeyword,
    allOf: allOfKeyword,
    anyOf: anyOfKeyword,
    contains: containsKeyword,
    minContains: minContainsKeyword,
    maxContains: maxContainsKeyword,
    dependentSchemas: dependentSchemasKeyword,
    if: ifKeyword,
    then: thenKeyword,
    else: elseKeyword,
    items: itemsKeyword,
    not: notKeyword,
    oneOf: oneOfKeyword,
    patternProperties: patternPropertiesKeyword,
    prefixItems: prefixItemsKeyword,
    properties: propertiesKeyword,
    propertyDependencies: propertyDependenciesKeyword,
    propertyNames: propertyNamesKeyword,

    // Validation
    const: constKeyword,
    dependentRequired: dependentRequiredKeyword,
    enum: enumKeyword,
    exclusiveMaximum: exclusiveMaximumKeyword,
    exclusiveMinimum: exclusiveMinimumKeyword,
    maxItems: maxItemsKeyword,
    maxLength: maxLengthKeyword,
    maxProperties: maxPropertiesKeyword,
    maximum: maximumKeyword,
    minItems: minItemsKeyword,
    minLength: minLengthKeyword,
    minProperties: minPropertiesKeyword,
    minimum: minimumKeyword,
    multipleOf: multipleOfKeyword,
    pattern: patternKeyword,
    required: requiredKeyword,
    type: typeKeyword,
    uniqueItems: uniqueItemsKeyword,

    // Meta-data
    default: defaultKeyword,
    deprecated: deprecatedKeyword,
    description: descriptionKeyword,
    examples: examplesKeyword,
    readOnly: readOnlyKeyword,
    title: titleKeyword,
    writeOnly: writeOnlyKeyword,

    // Format
    format: formatKeyword,

    // Content
    contentEncoding: contentEncodingKeyword,
    contentMediaType: contentMediaTypeKeyword,
    contentSchema: contentSchemaKeyword,

    // Unevaluated
    unevaluatedItems: unevaluatedItemsKeyword,
    unevaluatedProperties: unevaluatedPropertiesKeyword,

    // Keywords that aren't full proposals yet, and aren't part of the
    // dialect
    conditional: conditionalKeyword,
    itemPattern: itemPatternKeyword,
    requireAllExcept: requireAllExceptKeyword
  },
  unknownKeywords: "error",
  formats: {
    "date-time": dateTimeFormat,
    "date": dateFormat,
    "time": timeFormat,
    "duration": durationFormat,
    "email": emailFormat,
    "idn-email": "https://json-schema.org/format/idn-email",
    "hostname": "https://json-schema.org/format/hostname",
    "idn-hostname": "https://json-schema.org/format/idn-hostname",
    "ipv4": ipv4Format,
    "ipv6": ipv6Format,
    "uri": uriFormat,
    "uri-reference": uriReferenceFormat,
    "iri": iriFormat,
    "iri-reference": iriReferenceFormat,
    "uuid": uuidFormat,
    "uri-template": uriTemplateFormat,
    "json-pointer": jsonPointerFormat,
    "relative-json-pointer": relativeJsonPointerFormat,
    "regex": regexFormat
  },
  assertFormats: true
};
