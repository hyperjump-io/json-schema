import additionalItemsKeyword from "../../keywords/draft-2019-09/additionalItems.js";
import additionalPropertiesKeyword from "../../keywords/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import constKeyword from "../../keywords/const.js";
import containsKeyword from "../../keywords/contains.js";
import defaultKeyword from "../../keywords/default.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dependenciesKeyword from "../../keywords/draft-07/dependencies.js";
import descriptionKeyword from "../../keywords/description.js";
import enumKeyword from "../../keywords/enum.js";
import examplesKeyword from "../../keywords/examples.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import formatKeyword from "../../keywords/draft-07/format.js";
import idKeyword from "../../keywords/draft-07/id.js";
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
import refKeyword from "../../keywords/draft-07/ref.js";
import requiredKeyword from "../../keywords/required.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/draft-2020-12/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import dateTimeFormat from "../../formats/draft-2020-12/date-time.js";
import emailFormat from "../../formats/email.js";
import hostnameFormat from "../../formats/draft-06/hostname.js";
import ipv4Format from "../../formats/ipv4.js";
import ipv6Format from "../../formats/ipv6.js";
import uriFormat from "../../formats/uri.js";
import uriReferenceFormat from "../../formats/uri-reference.js";
import uriTemplateFormat from "../../formats/uri-template.js";
import jsonPointerFormat from "../../formats/json-pointer.js";

/**
 * @import * as API from "./index.d.ts"
 */

/** @type typeof API.draft06DialectUri */
export const draft06DialectUri = "http://json-schema.org/draft-06/schema";

/** @type typeof API.draft06Dialect */
export const draft06Dialect = {
  uri: draft06DialectUri,
  keywords: {
    additionalItems: additionalItemsKeyword,
    additionalProperties: additionalPropertiesKeyword,
    allOf: allOfKeyword,
    anyOf: anyOfKeyword,
    const: constKeyword,
    contains: containsKeyword,
    default: defaultKeyword,
    definitions: definitionsKeyword,
    dependencies: dependenciesKeyword,
    description: descriptionKeyword,
    enum: enumKeyword,
    examples: examplesKeyword,
    exclusiveMaximum: exclusiveMaximumKeyword,
    exclusiveMinimum: exclusiveMinimumKeyword,
    format: formatKeyword,
    $id: idKeyword,
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
    $ref: refKeyword,
    required: requiredKeyword,
    title: titleKeyword,
    type: typeKeyword,
    uniqueItems: uniqueItemsKeyword
  },
  unknownKeywords: "ignore",
  formats: {
    "date-time": dateTimeFormat,
    "email": emailFormat,
    "hostname": hostnameFormat,
    "ipv4": ipv4Format,
    "ipv6": ipv6Format,
    "uri": uriFormat,
    "uri-reference": uriReferenceFormat,
    "uri-template": uriTemplateFormat,
    "json-pointer": jsonPointerFormat
  },
  assertFormats: true
};
