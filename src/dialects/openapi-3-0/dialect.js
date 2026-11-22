import additionalPropertiesKeyword from "../../keywords/draft-2020-12/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import defaultKeyword from "../../keywords/default.js";
import deprecatedKeyword from "../../keywords/deprecated.js";
import descriptionKeyword from "../../keywords/description.js";
import discriminatorKeyword from "../../keywords/oas/3.1/discriminator.js";
import enumKeyword from "../../keywords/enum.js";
import exampleKeyword from "../../keywords/oas/3.2/example.js";
import exclusiveMaximumKeyword from "../../keywords/oas/3.0/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/oas/3.0/exclusiveMinimum.js";
import externalDocsKeyword from "../../keywords/oas/3.2/externalDocs.js";
import formatKeyword from "../../keywords/draft-07/format.js";
import itemsKeyword from "../../keywords/items.js";
import maximumKeyword from "../../keywords/oas/3.0/maximum.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import minimumKeyword from "../../keywords/oas/3.0/minimum.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import notKeyword from "../../keywords/not.js";
import nullableKeyword from "../../keywords/oas/3.0/nullable.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternKeyword from "../../keywords/draft-2020-12/pattern.js";
import propertiesKeyword from "../../keywords/properties.js";
import readOnlyKeyword from "../../keywords/readOnly.js";
import refKeyword from "../../keywords/draft-07/ref.js";
import requiredKeyword from "../../keywords/draft-04/required.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/oas/3.0/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import writeOnlyKeyword from "../../keywords/writeOnly.js";
import xmlKeyword from "../../keywords/oas/3.1/xml.js";
import dateFormat from "../../formats/date.js";
import dateTimeFormat from "../../formats/draft-2020-12/date-time.js";
import emailFormat from "../../formats/email.js";
import hostnameFormat from "../../formats/hostname.js";
import ipv4Format from "../../formats/ipv4.js";
import ipv6Format from "../../formats/ipv6.js";
import uriFormat from "../../formats/uri.js";
import int32Format from "../../formats/oas/3.2/int32.js";
import passwordFormat from "../../formats/oas/3.2/password.js";

/**
 * @import * as API from "./index.d.ts"
 */

/** @type typeof API.openApi30DialectUri */
export const openApi30DialectUri = "https://spec.openapis.org/oas/3.0/dialect";

/** @type typeof API.openApi30Dialect */
export const openApi30Dialect = {
  uri: openApi30DialectUri,
  keywords: {
    additionalProperties: additionalPropertiesKeyword,
    allOf: allOfKeyword,
    anyOf: anyOfKeyword,
    default: defaultKeyword,
    deprecated: deprecatedKeyword,
    description: descriptionKeyword,
    discriminator: discriminatorKeyword,
    enum: enumKeyword,
    example: exampleKeyword,
    exclusiveMaximum: exclusiveMaximumKeyword,
    exclusiveMinimum: exclusiveMinimumKeyword,
    externalDocs: externalDocsKeyword,
    format: formatKeyword,
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
    nullable: nullableKeyword,
    oneOf: oneOfKeyword,
    pattern: patternKeyword,
    properties: propertiesKeyword,
    readOnly: readOnlyKeyword,
    $ref: refKeyword,
    required: requiredKeyword,
    title: titleKeyword,
    type: typeKeyword,
    uniqueItems: uniqueItemsKeyword,
    writeOnly: writeOnlyKeyword,
    xml: xmlKeyword
  },
  unknownKeywords: "error",
  formats: {
    "date": dateFormat,
    "date-time": dateTimeFormat,
    "email": emailFormat,
    "hostname": hostnameFormat,
    "int32": int32Format,
    "ipv4": ipv4Format,
    "ipv6": ipv6Format,
    "password": passwordFormat,
    "uri": uriFormat
  },
  assertFormats: false
};
