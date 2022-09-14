const Core = require("./core");
const Configuration = require("./configuration");
const Keywords = require("./keywords");
const Schema = require("./schema");
const Instance = require("./instance");
const InvalidSchemaError = require("./invalid-schema-error");
const MediaTypes = require("./media-types");
const Validate = require("./keywords/validate");

const metaSchema = require("../meta/validation");
const coreMetaSchema = require("../meta/meta/core");
const applicatorMetaSchema = require("../meta/meta/applicator");
const validationMetaSchema = require("../meta/meta/validation");
const metaDataMetaSchema = require("../meta/meta/meta-data");
const formatAnnotationMetaSchema = require("../meta/meta/format-annotation");
const formatAssertionMetaSchema = require("../meta/meta/format-assertion");
const contentMetaSchema = require("../meta/meta/content");
const unevaluatedMetaSchema = require("../meta/meta/unevaluated");


MediaTypes.addPlugin("application/schema+json", {
  parse: async (response, contentTypeParameters) => [
    await response.json(),
    contentTypeParameters.schema || contentTypeParameters.profile
  ],
  matcher: (path) => path.endsWith(".schema.json")
});

Keywords.addKeyword(require("./keywords/additionalProperties"));
Keywords.addKeyword(require("./keywords/allOf"));
Keywords.addKeyword(require("./keywords/anchor"));
Keywords.addKeyword(require("./keywords/anyOf"));
Keywords.addKeyword(require("./keywords/const"));
Keywords.addKeyword(require("./keywords/contains"));
Keywords.addKeyword(require("./keywords/comment"));
Keywords.addKeyword(require("./keywords/contentEncoding"));
Keywords.addKeyword(require("./keywords/contentMediaType"));
Keywords.addKeyword(require("./keywords/contentSchema"));
Keywords.addKeyword(require("./keywords/default"));
Keywords.addKeyword(require("./keywords/definitions"));
Keywords.addKeyword(require("./keywords/dependentRequired"));
Keywords.addKeyword(require("./keywords/dependentSchemas"));
Keywords.addKeyword(require("./keywords/deprecated"));
Keywords.addKeyword(require("./keywords/description"));
Keywords.addKeyword(require("./keywords/dynamicAnchor"));
Keywords.addKeyword(require("./keywords/dynamicRef"));
Keywords.addKeyword(require("./keywords/else"));
Keywords.addKeyword(require("./keywords/enum"));
Keywords.addKeyword(require("./keywords/examples"));
Keywords.addKeyword(require("./keywords/exclusiveMaximum"));
Keywords.addKeyword(require("./keywords/exclusiveMinimum"));
Keywords.addKeyword(require("./keywords/format"));
Keywords.addKeyword(require("./keywords/id"));
Keywords.addKeyword(require("./keywords/if"));
Keywords.addKeyword(require("./keywords/items"));
Keywords.addKeyword(require("./keywords/maxContains"));
Keywords.addKeyword(require("./keywords/maxItems"));
Keywords.addKeyword(require("./keywords/maxLength"));
Keywords.addKeyword(require("./keywords/maxProperties"));
Keywords.addKeyword(require("./keywords/maximum"));
Keywords.addKeyword(require("./keywords/minContains"));
Keywords.addKeyword(require("./keywords/minItems"));
Keywords.addKeyword(require("./keywords/minLength"));
Keywords.addKeyword(require("./keywords/minProperties"));
Keywords.addKeyword(require("./keywords/minimum"));
Keywords.addKeyword(require("./keywords/multipleOf"));
Keywords.addKeyword(require("./keywords/not"));
Keywords.addKeyword(require("./keywords/oneOf"));
Keywords.addKeyword(require("./keywords/pattern"));
Keywords.addKeyword(require("./keywords/patternProperties"));
Keywords.addKeyword(require("./keywords/prefixItems"));
Keywords.addKeyword(require("./keywords/properties"));
Keywords.addKeyword(require("./keywords/propertyDependencies"));
Keywords.addKeyword(require("./keywords/propertyNames"));
Keywords.addKeyword(require("./keywords/readOnly"));
Keywords.addKeyword(require("./keywords/ref"));
Keywords.addKeyword(require("./keywords/requireAllExcept"));
Keywords.addKeyword(require("./keywords/required"));
Keywords.addKeyword(require("./keywords/title"));
Keywords.addKeyword(require("./keywords/then"));
Keywords.addKeyword(require("./keywords/type"));
Keywords.addKeyword(require("./keywords/unevaluatedItems"));
Keywords.addKeyword(require("./keywords/unevaluatedProperties"));
Keywords.addKeyword(require("./keywords/uniqueItems"));
Keywords.addKeyword(require("./keywords/vocabulary"));
Keywords.addKeyword(require("./keywords/writeOnly"));


Keywords.defineVocabulary("https://json-schema.org/vocab/core", {
  "$anchor": "https://json-schema.org/keyword/anchor",
  "$comment": "https://json-schema.org/keyword/comment",
  "$defs": "https://json-schema.org/keyword/definitions",
  "$dynamicAnchor": "https://json-schema.org/keyword/dynamicAnchor",
  "$dynamicRef": "https://json-schema.org/keyword/dynamicRef",
  "$id": "https://json-schema.org/keyword/id",
  "$ref": "https://json-schema.org/keyword/ref",
  "$vocabulary": "https://json-schema.org/keyword/vocabulary"
});

Keywords.defineVocabulary("https://json-schema.org/vocab/applicator", {
  "additionalProperties": "https://json-schema.org/keyword/additionalProperties",
  "allOf": "https://json-schema.org/keyword/allOf",
  "anyOf": "https://json-schema.org/keyword/anyOf",
  "contains": "https://json-schema.org/keyword/contains",
  "minContains": "https://json-schema.org/keyword/minContains",
  "maxContains": "https://json-schema.org/keyword/maxContains",
  "dependentSchemas": "https://json-schema.org/keyword/dependentSchemas",
  "if": "https://json-schema.org/keyword/if",
  "then": "https://json-schema.org/keyword/then",
  "else": "https://json-schema.org/keyword/else",
  "items": "https://json-schema.org/keyword/items",
  "not": "https://json-schema.org/keyword/not",
  "oneOf": "https://json-schema.org/keyword/oneOf",
  "patternProperties": "https://json-schema.org/keyword/patternProperties",
  "prefixItems": "https://json-schema.org/keyword/prefixItems",
  "properties": "https://json-schema.org/keyword/properties",
  "propertyDependencies": "https://json-schema.org/keyword/propertyDependencies",
  "propertyNames": "https://json-schema.org/keyword/propertyNames"
});

Keywords.defineVocabulary("https://json-schema.org/vocab/validation", {
  "const": "https://json-schema.org/keyword/const",
  "dependentRequired": "https://json-schema.org/keyword/dependentRequired",
  "enum": "https://json-schema.org/keyword/enum",
  "exclusiveMaximum": "https://json-schema.org/keyword/exclusiveMaximum",
  "exclusiveMinimum": "https://json-schema.org/keyword/exclusiveMinimum",
  "maxItems": "https://json-schema.org/keyword/maxItems",
  "maxLength": "https://json-schema.org/keyword/maxLength",
  "maxProperties": "https://json-schema.org/keyword/maxProperties",
  "maximum": "https://json-schema.org/keyword/maximum",
  "minItems": "https://json-schema.org/keyword/minItems",
  "minLength": "https://json-schema.org/keyword/minLength",
  "minProperties": "https://json-schema.org/keyword/minProperties",
  "minimum": "https://json-schema.org/keyword/minimum",
  "multipleOf": "https://json-schema.org/keyword/multipleOf",
  "requireAllExcept": "https://json-schema.org/keyword/requireAllExcept",
  "pattern": "https://json-schema.org/keyword/pattern",
  "required": "https://json-schema.org/keyword/required",
  "type": "https://json-schema.org/keyword/type",
  "uniqueItems": "https://json-schema.org/keyword/uniqueItems"
});

Keywords.defineVocabulary("https://json-schema.org/vocab/meta-data", {
  "default": "https://json-schema.org/keyword/default",
  "deprecated": "https://json-schema.org/keyword/deprecated",
  "description": "https://json-schema.org/keyword/description",
  "examples": "https://json-schema.org/keyword/examples",
  "readOnly": "https://json-schema.org/keyword/readOnly",
  "title": "https://json-schema.org/keyword/title",
  "writeOnly": "https://json-schema.org/keyword/writeOnly"
});

Keywords.defineVocabulary("https://json-schema.org/vocab/format-annotation", {
  "format": "https://json-schema.org/keyword/format"
});

Keywords.defineVocabulary("https://json-schema.org/vocab/format-assertion", {
  "format": "https://json-schema.org/keyword/format-assertion"
});

Keywords.defineVocabulary("https://json-schema.org/vocab/content", {
  "contentEncoding": "https://json-schema.org/keyword/contentEncoding",
  "contentMediaType": "https://json-schema.org/keyword/contentMediaType",
  "contentSchema": "https://json-schema.org/keyword/contentSchema"
});

Keywords.defineVocabulary("https://json-schema.org/vocab/unevaluated", {
  "unevaluatedItems": "https://json-schema.org/keyword/unevaluatedItems",
  "unevaluatedProperties": "https://json-schema.org/keyword/unevaluatedProperties"
});

Keywords.loadDialect("https://json-schema.org/validation", {
  "https://json-schema.org/vocab/core": true,
  "https://json-schema.org/vocab/applicator": true,
  "https://json-schema.org/vocab/validation": true,
  "https://json-schema.org/vocab/meta-data": true,
  "https://json-schema.org/vocab/format-annotation": true,
  "https://json-schema.org/vocab/content": true,
  "https://json-schema.org/vocab/unevaluated": true
});

Schema.add(JSON.parse(metaSchema));
Schema.add(JSON.parse(coreMetaSchema));
Schema.add(JSON.parse(applicatorMetaSchema));
Schema.add(JSON.parse(validationMetaSchema));
Schema.add(JSON.parse(metaDataMetaSchema));
Schema.add(JSON.parse(formatAnnotationMetaSchema));
Schema.add(JSON.parse(formatAssertionMetaSchema));
Schema.add(JSON.parse(contentMetaSchema));
Schema.add(JSON.parse(unevaluatedMetaSchema));

module.exports = {
  ...Core,
  ...Configuration,
  Instance,
  InvalidSchemaError,
  Keywords,
  Schema,
  Validate
};
