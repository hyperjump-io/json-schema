const { Core, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("./keywords");
const metaSchema = require("../meta/draft/2020-12/schema");
const coreMetaSchema = require("../meta/draft/2020-12/meta/core");
const applicatorMetaSchema = require("../meta/draft/2020-12/meta/applicator");
const validationMetaSchema = require("../meta/draft/2020-12/meta/validation");
const metaDataMetaSchema = require("../meta/draft/2020-12/meta/meta-data");
const formatAnnotationMetaSchema = require("../meta/draft/2020-12/meta/format-annotation");
const formatAssertionMetaSchema = require("../meta/draft/2020-12/meta/format-assertion");
const contentMetaSchema = require("../meta/draft/2020-12/meta/content");
const unevaluatedMetaSchema = require("../meta/draft/2020-12/meta/unevaluated");


const schemaVersion = "https://json-schema.org/draft/2020-12/schema";

Schema.setConfig(schemaVersion, "baseToken", "$id");
Schema.setConfig(schemaVersion, "embeddedToken", "$id");
Schema.setConfig(schemaVersion, "anchorToken", "$anchor");
Schema.setConfig(schemaVersion, "dynamicAnchorToken", "$dynamicAnchor");
Schema.setConfig(schemaVersion, "vocabularyToken", "$vocabulary");
Schema.setConfig(schemaVersion, "mandatoryVocabularies", ["https://json-schema.org/draft/2020-12/vocab/core"]);

Schema.add(JSON.parse(metaSchema));

Schema.add(JSON.parse(coreMetaSchema));
Core.defineVocabulary("https://json-schema.org/draft/2020-12/vocab/core", {
  "validate": keywords.validate,
  "$defs": keywords.definitions,
  "$dynamicRef": keywords.dynamicRef,
  "$ref": keywords.ref
});

Schema.add(JSON.parse(applicatorMetaSchema));
Core.defineVocabulary("https://json-schema.org/draft/2020-12/vocab/applicator", {
  "additionalProperties": keywords.additionalProperties6,
  "allOf": keywords.allOf,
  "anyOf": keywords.anyOf,
  "contains": keywords.containsMinContainsMaxContains,
  "dependentSchemas": keywords.dependentSchemas,
  "if": keywords.if,
  "then": keywords.then,
  "else": keywords.else,
  "items": keywords.items202012,
  "not": keywords.not,
  "oneOf": keywords.oneOf,
  "patternProperties": keywords.patternProperties,
  "prefixItems": keywords.tupleItems,
  "properties": keywords.properties,
  "propertyNames": keywords.propertyNames
});

Schema.add(JSON.parse(validationMetaSchema));
Core.defineVocabulary("https://json-schema.org/draft/2020-12/vocab/validation", {
  "const": keywords.const,
  "dependentRequired": keywords.dependentRequired,
  "enum": keywords.enum,
  "exclusiveMaximum": keywords.exclusiveMaximum,
  "exclusiveMinimum": keywords.exclusiveMinimum,
  "maxItems": keywords.maxItems,
  "maxLength": keywords.maxLength6,
  "maxProperties": keywords.maxProperties,
  "maximum": keywords.maximum,
  "minItems": keywords.minItems,
  "minLength": keywords.minLength6,
  "minProperties": keywords.minProperties,
  "minimum": keywords.minimum,
  "multipleOf": keywords.multipleOf,
  "pattern": keywords.pattern,
  "required": keywords.required,
  "type": keywords.type,
  "uniqueItems": keywords.uniqueItems
});

Schema.add(JSON.parse(metaDataMetaSchema));
Core.defineVocabulary("https://json-schema.org/draft/2020-12/vocab/meta-data", {
  "default": keywords.metaData,
  "deprecated": keywords.metaData,
  "description": keywords.metaData,
  "examples": keywords.metaData,
  "readOnly": keywords.metaData,
  "title": keywords.metaData,
  "writeOnly": keywords.metaData
});

Schema.add(JSON.parse(formatAnnotationMetaSchema));
Core.defineVocabulary("https://json-schema.org/draft/2020-12/vocab/format-annotation", {
  "format": keywords.metaData
});

Schema.add(JSON.parse(formatAssertionMetaSchema));

Schema.add(JSON.parse(contentMetaSchema));
Core.defineVocabulary("https://json-schema.org/draft/2020-12/vocab/content", {
  "contentEncoding": keywords.metaData,
  "contentMediaType": keywords.metaData,
  "contentSchema": keywords.metaData
});

Schema.add(JSON.parse(unevaluatedMetaSchema));
Core.defineVocabulary("https://json-schema.org/draft/2020-12/vocab/unevaluated", {
  "unevaluatedItems": keywords.unevaluatedItems,
  "unevaluatedProperties": keywords.unevaluatedProperties
});
