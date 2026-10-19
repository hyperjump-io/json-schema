import idKeyword from "../keywords/draft-04/id.js";
import refKeyword from "../keywords/draft-04/ref.js";
import itemsKeyword from "../keywords/draft-04/items.js";
import additionalItemsKeyword from "../keywords/draft-04/additionalItems.js";
import dependenciesKeyword from "../keywords/draft-04/dependencies.js";
import formatKeyword from "../keywords/draft-04/format.js";
import hostnameFormat from "../formats/draft-04/hostname.js";

/**
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

/** @type API.addDraft06 */
export const addDraft06 = (jsonSchema) => {
  jsonSchema.addKeyword(idKeyword);
  jsonSchema.addKeyword(refKeyword);
  jsonSchema.addKeyword(itemsKeyword);
  jsonSchema.addKeyword(additionalItemsKeyword);
  jsonSchema.addKeyword(dependenciesKeyword);
  jsonSchema.addKeyword(formatKeyword);
  jsonSchema.addFormat(hostnameFormat);

  jsonSchema.addDialect(draft06Dialect);
};
