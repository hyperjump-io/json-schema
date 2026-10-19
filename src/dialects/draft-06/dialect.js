import additionalItemsKeyword from "../../keywords/draft-04/additionalItems.js";
import additionalPropertiesKeyword from "../../keywords/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import constKeyword from "../../keywords/const.js";
import containsKeyword from "../../keywords/contains.js";
import defaultKeyword from "../../keywords/default.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dependenciesKeyword from "../../keywords/draft-04/dependencies.js";
import descriptionKeyword from "../../keywords/description.js";
import enumKeyword from "../../keywords/enum.js";
import examplesKeyword from "../../keywords/examples.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import formatKeyword from "../../keywords/draft-04/format.js";
import idKeyword from "../../keywords/draft-04/id.js";
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
import refKeyword from "../../keywords/draft-04/ref.js";
import requiredKeyword from "../../keywords/required.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import hostnameFormat from "../../formats/draft-04/hostname.js";
import { addPreset } from "../add-preset.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import * as API from "./index.d.ts"
 */

/** @type API.draft06DialectUri */
export const draft06DialectUri = "http://json-schema.org/draft-06/schema";

/** @type API.draft06Dialect */
export const draft06Dialect = {
  uri: draft06DialectUri,
  keywords: {
    additionalItems: additionalItemsKeyword.uri,
    additionalProperties: "https://json-schema.org/keyword/additionalProperties",
    allOf: "https://json-schema.org/keyword/allOf",
    anyOf: "https://json-schema.org/keyword/anyOf",
    const: "https://json-schema.org/keyword/const",
    contains: "https://json-schema.org/keyword/contains",
    default: "https://json-schema.org/keyword/default",
    definitions: "https://json-schema.org/keyword/definitions",
    dependencies: dependenciesKeyword.uri,
    description: "https://json-schema.org/keyword/description",
    enum: "https://json-schema.org/keyword/enum",
    examples: "https://json-schema.org/keyword/examples",
    exclusiveMaximum: "https://json-schema.org/keyword/exclusiveMaximum",
    exclusiveMinimum: "https://json-schema.org/keyword/exclusiveMinimum",
    format: formatKeyword.uri,
    $id: idKeyword.uri,
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
    $ref: refKeyword.uri,
    required: "https://json-schema.org/keyword/required",
    title: "https://json-schema.org/keyword/title",
    type: "https://json-schema.org/keyword/type",
    uniqueItems: "https://json-schema.org/keyword/uniqueItems"
  },
  unknownKeywords: "ignore",
  formats: {
    "date-time": "https://json-schema.org/format/date-time",
    "email": "https://json-schema.org/format/email",
    "hostname": hostnameFormat.uri,
    "ipv4": "https://json-schema.org/format/ipv4",
    "ipv6": "https://json-schema.org/format/ipv6",
    "uri": "https://json-schema.org/format/uri",
    "uri-reference": "https://json-schema.org/format/uri-reference",
    "uri-template": "https://json-schema.org/format/uri-template",
    "json-pointer": "https://json-schema.org/format/json-pointer"
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
  constKeyword,
  containsKeyword,
  defaultKeyword,
  definitionsKeyword,
  dependenciesKeyword,
  descriptionKeyword,
  enumKeyword,
  examplesKeyword,
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
  propertyNamesKeyword,
  refKeyword,
  requiredKeyword,
  titleKeyword,
  typeKeyword,
  uniqueItemsKeyword
];

/** @type API.addDraft06 */
export const addDraft06 = (jsonSchema) => {
  addPreset(jsonSchema, draft06Dialect, { keywords, formats: [hostnameFormat] });
};
