import additionalItemsKeyword from "../../keywords/draft-2019-09/additionalItems.js";
import additionalPropertiesKeyword from "../../keywords/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import commentKeyword from "../../keywords/comment.js";
import constKeyword from "../../keywords/const.js";
import containsKeyword from "../../keywords/contains.js";
import contentEncodingKeyword from "../../keywords/contentEncoding.js";
import contentMediaTypeKeyword from "../../keywords/contentMediaType.js";
import defaultKeyword from "../../keywords/default.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dependenciesKeyword from "../../keywords/draft-07/dependencies.js";
import descriptionKeyword from "../../keywords/description.js";
import elseKeyword from "../../keywords/else.js";
import enumKeyword from "../../keywords/enum.js";
import examplesKeyword from "../../keywords/examples.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import formatKeyword from "../../keywords/draft-07/format.js";
import idKeyword from "../../keywords/draft-07/id.js";
import ifKeyword from "../../keywords/if.js";
import itemsKeyword from "../../keywords/draft-2019-09/items.js";
import maximumKeyword from "../../keywords/maximum.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import minimumKeyword from "../../keywords/minimum.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import notKeyword from "../../keywords/not.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternKeyword from "../../keywords/pattern.js";
import patternPropertiesKeyword from "../../keywords/patternProperties.js";
import propertiesKeyword from "../../keywords/properties.js";
import propertyNamesKeyword from "../../keywords/propertyNames.js";
import readOnlyKeyword from "../../keywords/readOnly.js";
import refKeyword from "../../keywords/draft-07/ref.js";
import requiredKeyword from "../../keywords/required.js";
import thenKeyword from "../../keywords/then.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/draft-2020-12/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import writeOnlyKeyword from "../../keywords/writeOnly.js";
import dateTimeFormat from "../../formats/date-time.js";
import dateFormat from "../../formats/date.js";
import timeFormat from "../../formats/time.js";
import emailFormat from "../../formats/email.js";
import ipv4Format from "../../formats/ipv4.js";
import ipv6Format from "../../formats/ipv6.js";
import uriFormat from "../../formats/uri.js";
import uriReferenceFormat from "../../formats/uri-reference.js";
import iriFormat from "../../formats/iri.js";
import iriReferenceFormat from "../../formats/iri-reference.js";
import uriTemplateFormat from "../../formats/uri-template.js";
import jsonPointerFormat from "../../formats/json-pointer.js";
import relativeJsonPointerFormat from "../../formats/relative-json-pointer.js";
import regexFormat from "../../formats/regex.js";

/**
 * @import * as API from "./index.d.ts"
 */

/** @type API.draft07DialectUri */
export const draft07DialectUri = "http://json-schema.org/draft-07/schema";

/** @type API.draft07Dialect */
export const draft07Dialect = {
  uri: draft07DialectUri,
  keywords: {
    additionalItems: additionalItemsKeyword,
    additionalProperties: additionalPropertiesKeyword,
    allOf: allOfKeyword,
    anyOf: anyOfKeyword,
    $comment: commentKeyword,
    const: constKeyword,
    contains: containsKeyword,
    contentEncoding: contentEncodingKeyword,
    contentMediaType: contentMediaTypeKeyword,
    default: defaultKeyword,
    definitions: definitionsKeyword,
    dependencies: dependenciesKeyword,
    description: descriptionKeyword,
    else: elseKeyword,
    enum: enumKeyword,
    examples: examplesKeyword,
    exclusiveMaximum: exclusiveMaximumKeyword,
    exclusiveMinimum: exclusiveMinimumKeyword,
    format: formatKeyword,
    $id: idKeyword,
    if: ifKeyword,
    items: itemsKeyword,
    maximum: maximumKeyword,
    maxItems: maxItemsKeyword,
    maxLength: maxLengthKeyword,
    maxProperties: maxPropertiesKeyword,
    minimum: minimumKeyword,
    minItems: minItemsKeyword,
    minLength: minLengthKeyword,
    minProperties: minPropertiesKeyword,
    multipleOf: multipleOfKeyword,
    not: notKeyword,
    oneOf: oneOfKeyword,
    pattern: patternKeyword,
    patternProperties: patternPropertiesKeyword,
    properties: propertiesKeyword,
    propertyNames: propertyNamesKeyword,
    readOnly: readOnlyKeyword,
    $ref: refKeyword,
    required: requiredKeyword,
    then: thenKeyword,
    title: titleKeyword,
    type: typeKeyword,
    uniqueItems: uniqueItemsKeyword,
    writeOnly: writeOnlyKeyword
  },
  unknownKeywords: "ignore",
  formats: {
    "date-time": dateTimeFormat,
    "date": dateFormat,
    "time": timeFormat,
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
    "uri-template": uriTemplateFormat,
    "json-pointer": jsonPointerFormat,
    "relative-json-pointer": relativeJsonPointerFormat,
    "regex": regexFormat
  },
  assertFormats: true
};
