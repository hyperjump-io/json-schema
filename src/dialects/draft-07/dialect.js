import additionalItemsKeyword from "../../keywords/draft-04/additionalItems.js";
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
import dependenciesKeyword from "../../keywords/draft-06/dependencies.js";
import descriptionKeyword from "../../keywords/description.js";
import elseKeyword from "../../keywords/else.js";
import enumKeyword from "../../keywords/enum.js";
import examplesKeyword from "../../keywords/examples.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import formatKeyword from "../../keywords/draft-04/format.js";
import idKeyword from "../../keywords/draft-04/id.js";
import ifKeyword from "../../keywords/if.js";
import itemsKeyword from "../../keywords/draft-04/items.js";
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
import refKeyword from "../../keywords/draft-04/ref.js";
import requiredKeyword from "../../keywords/required.js";
import thenKeyword from "../../keywords/then.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/type.js";
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
import { addPreset } from "../add-preset.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { Format } from "../../format.d.ts"
 * @import * as API from "./index.d.ts"
 */

/** @type API.draft07DialectUri */
export const draft07DialectUri = "http://json-schema.org/draft-07/schema";

/** @type API.draft07Dialect */
export const draft07Dialect = {
  uri: draft07DialectUri,
  keywords: {
    additionalItems: additionalItemsKeyword.uri,
    additionalProperties: "https://json-schema.org/keyword/additionalProperties",
    allOf: "https://json-schema.org/keyword/allOf",
    anyOf: "https://json-schema.org/keyword/anyOf",
    $comment: "https://json-schema.org/keyword/comment",
    const: "https://json-schema.org/keyword/const",
    contains: "https://json-schema.org/keyword/contains",
    contentEncoding: "https://json-schema.org/keyword/contentEncoding",
    contentMediaType: "https://json-schema.org/keyword/contentMediaType",
    default: "https://json-schema.org/keyword/default",
    definitions: "https://json-schema.org/keyword/definitions",
    dependencies: dependenciesKeyword.uri,
    description: "https://json-schema.org/keyword/description",
    else: "https://json-schema.org/keyword/else",
    enum: "https://json-schema.org/keyword/enum",
    examples: "https://json-schema.org/keyword/examples",
    exclusiveMaximum: "https://json-schema.org/keyword/exclusiveMaximum",
    exclusiveMinimum: "https://json-schema.org/keyword/exclusiveMinimum",
    format: formatKeyword.uri,
    $id: idKeyword.uri,
    if: "https://json-schema.org/keyword/if",
    items: itemsKeyword.uri,
    maximum: "https://json-schema.org/keyword/maximum",
    maxItems: "https://json-schema.org/keyword/maxItems",
    maxLength: "https://json-schema.org/keyword/maxLength",
    maxProperties: "https://json-schema.org/keyword/maxProperties",
    minimum: "https://json-schema.org/keyword/minimum",
    minItems: "https://json-schema.org/keyword/minItems",
    minLength: "https://json-schema.org/keyword/minLength",
    minProperties: "https://json-schema.org/keyword/minProperties",
    multipleOf: "https://json-schema.org/keyword/multipleOf",
    not: "https://json-schema.org/keyword/not",
    oneOf: "https://json-schema.org/keyword/oneOf",
    pattern: "https://json-schema.org/keyword/pattern",
    patternProperties: "https://json-schema.org/keyword/patternProperties",
    properties: "https://json-schema.org/keyword/properties",
    propertyNames: "https://json-schema.org/keyword/propertyNames",
    readOnly: "https://json-schema.org/keyword/readOnly",
    $ref: refKeyword.uri,
    required: "https://json-schema.org/keyword/required",
    then: "https://json-schema.org/keyword/then",
    title: "https://json-schema.org/keyword/title",
    type: "https://json-schema.org/keyword/type",
    uniqueItems: "https://json-schema.org/keyword/uniqueItems",
    writeOnly: "https://json-schema.org/keyword/writeOnly"
  },
  unknownKeywords: "ignore",
  formats: {
    "date-time": "https://json-schema.org/format/date-time",
    "date": "https://json-schema.org/format/date",
    "time": "https://json-schema.org/format/time",
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
    "uri-template": "https://json-schema.org/format/uri-template",
    "json-pointer": "https://json-schema.org/format/json-pointer",
    "relative-json-pointer": "https://json-schema.org/format/relative-json-pointer",
    "regex": "https://json-schema.org/format/regex"
  },
  assertFormats: true
};

/**
 * The keyword definitions the dialect uses
 *
 * @type Keyword<any>[]
 */
const keywords = [
  additionalItemsKeyword,
  additionalPropertiesKeyword,
  allOfKeyword,
  anyOfKeyword,
  commentKeyword,
  constKeyword,
  containsKeyword,
  contentEncodingKeyword,
  contentMediaTypeKeyword,
  defaultKeyword,
  definitionsKeyword,
  dependenciesKeyword,
  descriptionKeyword,
  elseKeyword,
  enumKeyword,
  examplesKeyword,
  exclusiveMaximumKeyword,
  exclusiveMinimumKeyword,
  formatKeyword,
  idKeyword,
  ifKeyword,
  itemsKeyword,
  maximumKeyword,
  maxItemsKeyword,
  maxLengthKeyword,
  maxPropertiesKeyword,
  minimumKeyword,
  minItemsKeyword,
  minLengthKeyword,
  minPropertiesKeyword,
  multipleOfKeyword,
  notKeyword,
  oneOfKeyword,
  patternKeyword,
  patternPropertiesKeyword,
  propertiesKeyword,
  propertyNamesKeyword,
  readOnlyKeyword,
  refKeyword,
  requiredKeyword,
  thenKeyword,
  titleKeyword,
  typeKeyword,
  uniqueItemsKeyword,
  writeOnlyKeyword
];

/**
 * The format definitions the dialect uses. Formats that need large tables of
 * Unicode data aren't included. They're added with the full formats.
 *
 * @type Format[]
 */
const formats = [
  dateTimeFormat,
  dateFormat,
  timeFormat,
  emailFormat,
  ipv4Format,
  ipv6Format,
  uriFormat,
  uriReferenceFormat,
  iriFormat,
  iriReferenceFormat,
  uriTemplateFormat,
  jsonPointerFormat,
  relativeJsonPointerFormat,
  regexFormat
];

/** @type API.addDraft07 */
export const addDraft07 = (jsonSchema) => {
  addPreset(jsonSchema, draft07Dialect, { keywords, formats });
};
