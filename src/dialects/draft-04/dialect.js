import additionalItemsKeyword from "../../keywords/draft-2019-09/additionalItems.js";
import additionalPropertiesKeyword from "../../keywords/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import defaultKeyword from "../../keywords/default.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dependenciesKeyword from "../../keywords/draft-04/dependencies.js";
import descriptionKeyword from "../../keywords/description.js";
import enumKeyword from "../../keywords/draft-04/enum.js";
import exclusiveMaximumKeyword from "../../keywords/draft-04/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/draft-04/exclusiveMinimum.js";
import formatKeyword from "../../keywords/draft-07/format.js";
import idKeyword from "../../keywords/draft-07/id.js";
import itemsKeyword from "../../keywords/draft-2019-09/items.js";
import maximumKeyword from "../../keywords/draft-04/maximum.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import minimumKeyword from "../../keywords/draft-04/minimum.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import notKeyword from "../../keywords/not.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternKeyword from "../../keywords/pattern.js";
import patternPropertiesKeyword from "../../keywords/patternProperties.js";
import propertiesKeyword from "../../keywords/properties.js";
import refKeyword from "../../keywords/draft-07/ref.js";
import requiredKeyword from "../../keywords/draft-04/required.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/draft-2020-12/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import dateTimeFormat from "../../formats/date-time.js";
import emailFormat from "../../formats/email.js";
import hostnameFormat from "../../formats/draft-06/hostname.js";
import ipv4Format from "../../formats/ipv4.js";
import ipv6Format from "../../formats/ipv6.js";
import uriFormat from "../../formats/uri.js";
import { addPreset } from "../add-preset.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { Format } from "../../format.d.ts"
 * @import * as API from "./index.d.ts"
 */

/** @type API.draft04DialectUri */
export const draft04DialectUri = "http://json-schema.org/draft-04/schema";

/** @type API.draft04Dialect */
export const draft04Dialect = {
  uri: draft04DialectUri,
  keywords: {
    additionalItems: additionalItemsKeyword.uri,
    additionalProperties: "https://json-schema.org/keyword/additionalProperties",
    allOf: "https://json-schema.org/keyword/allOf",
    anyOf: "https://json-schema.org/keyword/anyOf",
    default: "https://json-schema.org/keyword/default",
    definitions: "https://json-schema.org/keyword/definitions",
    dependencies: dependenciesKeyword.uri,
    description: "https://json-schema.org/keyword/description",
    enum: enumKeyword.uri,
    exclusiveMaximum: exclusiveMaximumKeyword.uri,
    exclusiveMinimum: exclusiveMinimumKeyword.uri,
    format: formatKeyword.uri,
    id: idKeyword.uri,
    items: itemsKeyword.uri,
    maximum: maximumKeyword.uri,
    maxItems: "https://json-schema.org/keyword/maxItems",
    maxLength: "https://json-schema.org/keyword/maxLength",
    maxProperties: "https://json-schema.org/keyword/maxProperties",
    minimum: minimumKeyword.uri,
    minItems: "https://json-schema.org/keyword/minItems",
    minLength: "https://json-schema.org/keyword/minLength",
    minProperties: "https://json-schema.org/keyword/minProperties",
    multipleOf: "https://json-schema.org/keyword/multipleOf",
    not: "https://json-schema.org/keyword/not",
    oneOf: "https://json-schema.org/keyword/oneOf",
    pattern: "https://json-schema.org/keyword/pattern",
    patternProperties: "https://json-schema.org/keyword/patternProperties",
    properties: "https://json-schema.org/keyword/properties",
    $ref: refKeyword.uri,
    required: requiredKeyword.uri,
    title: "https://json-schema.org/keyword/title",
    type: typeKeyword.uri,
    uniqueItems: "https://json-schema.org/keyword/uniqueItems"
  },
  unknownKeywords: "ignore",
  formats: {
    "date-time": "https://json-schema.org/format/date-time",
    "email": "https://json-schema.org/format/email",
    "hostname": hostnameFormat.uri,
    "ipv4": "https://json-schema.org/format/ipv4",
    "ipv6": "https://json-schema.org/format/ipv6",
    "uri": "https://json-schema.org/format/uri"
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
  defaultKeyword,
  definitionsKeyword,
  dependenciesKeyword,
  descriptionKeyword,
  enumKeyword,
  exclusiveMaximumKeyword,
  exclusiveMinimumKeyword,
  formatKeyword,
  idKeyword,
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
  refKeyword,
  requiredKeyword,
  titleKeyword,
  typeKeyword,
  uniqueItemsKeyword
];

/**
 * The format definitions the dialect uses. Formats that need large tables of
 * Unicode data aren't included. They're added with the full formats.
 *
 * @type Format[]
 */
const formats = [
  dateTimeFormat,
  emailFormat,
  hostnameFormat,
  ipv4Format,
  ipv6Format,
  uriFormat
];

/** @type API.addDraft04 */
export const addDraft04 = (jsonSchema) => {
  addPreset(jsonSchema, draft04Dialect, { keywords, formats });
};
