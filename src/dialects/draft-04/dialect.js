import additionalItemsKeyword from "../../keywords/draft-2019-09/additionalItems.js";
import additionalPropertiesKeyword from "../../keywords/draft-2020-12/additionalProperties.js";
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
import patternKeyword from "../../keywords/draft-2020-12/pattern.js";
import patternPropertiesKeyword from "../../keywords/draft-2020-12/patternProperties.js";
import propertiesKeyword from "../../keywords/properties.js";
import refKeyword from "../../keywords/draft-07/ref.js";
import requiredKeyword from "../../keywords/draft-04/required.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/draft-2020-12/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import dateTimeFormat from "../../formats/draft-2020-12/date-time.js";
import emailFormat from "../../formats/email.js";
import hostnameFormat from "../../formats/hostname.js";
import ipv4Format from "../../formats/ipv4.js";
import ipv6Format from "../../formats/ipv6.js";
import uriFormat from "../../formats/uri.js";

/**
 * @import * as API from "./index.d.ts"
 */

/** @type typeof API.draft04DialectUri */
export const draft04DialectUri = "http://json-schema.org/draft-04/schema";

/** @type typeof API.draft04Dialect */
export const draft04Dialect = {
  uri: draft04DialectUri,
  keywords: {
    additionalItems: additionalItemsKeyword,
    additionalProperties: additionalPropertiesKeyword,
    allOf: allOfKeyword,
    anyOf: anyOfKeyword,
    default: defaultKeyword,
    definitions: definitionsKeyword,
    dependencies: dependenciesKeyword,
    description: descriptionKeyword,
    enum: enumKeyword,
    exclusiveMaximum: exclusiveMaximumKeyword,
    exclusiveMinimum: exclusiveMinimumKeyword,
    format: formatKeyword,
    id: idKeyword,
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
    "uri": uriFormat
  },
  assertFormats: true
};
