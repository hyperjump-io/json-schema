import idKeyword from "../../keywords/draft-04/id.js";
import refKeyword from "../../keywords/draft-04/ref.js";
import itemsKeyword from "../../keywords/draft-04/items.js";
import additionalItemsKeyword from "../../keywords/draft-04/additionalItems.js";
import dependenciesKeyword from "../../keywords/draft-04/dependencies.js";
import formatKeyword from "../../keywords/draft-04/format.js";

/**
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

/** @type API.addDraft07 */
export const addDraft07 = (jsonSchema) => {
  jsonSchema.addKeyword(idKeyword);
  jsonSchema.addKeyword(refKeyword);
  jsonSchema.addKeyword(itemsKeyword);
  jsonSchema.addKeyword(additionalItemsKeyword);
  jsonSchema.addKeyword(dependenciesKeyword);
  jsonSchema.addKeyword(formatKeyword);

  jsonSchema.addDialect(draft07Dialect);
};
