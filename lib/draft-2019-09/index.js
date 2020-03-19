const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("../keywords");
const metaSchema = require("./meta/schema.schema.json");
const coreMetaSchema = require("./meta/meta/core.schema.json");
const applicatorMetaSchema = require("./meta/meta/applicator.schema.json");
const validationMetaSchema = require("./meta/meta/validation.schema.json");
const metaDataMetaSchema = require("./meta/meta/meta-data.schema.json");
const formatMetaSchema = require("./meta/meta/format.schema.json");
const contentMetaSchema = require("./meta/meta/content.schema.json");


Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "keywordReference", true);
Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "keywordRecursiveReference", true);
Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "idToken", "$id");
Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "anchorToken", "$anchor");

Schema.add(coreMetaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/core", {
  "$comment": keywords.metaData,
  "$defs": keywords.definitions,
  "$recursiveRef": keywords.$recursiveRef,
  "$ref": keywords.$ref
});

Schema.add(applicatorMetaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/applicator", {
  "additionalItems": keywords.additionalItems,
  "additionalProperties": keywords.additionalProperties,
  "allOf": keywords.allOf,
  "anyOf": keywords.anyOf,
  "contains": keywords.contains,
  "dependentSchemas": keywords.dependentSchemas,
  "if": keywords.ifThenElse,
  "items": keywords.items,
  "not": keywords.not,
  "oneOf": keywords.oneOf,
  "patternProperties": keywords.patternProperties,
  "properties": keywords.properties,
  "propertyNames": keywords.propertyNames
});

Schema.add(validationMetaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/validation", {
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

Schema.add(metaDataMetaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/meta-data", {
  "default": keywords.metaData,
  "deprecated": keywords.metaData,
  "description": keywords.metaData,
  "examples": keywords.metaData,
  "readOnly": keywords.metaData,
  "title": keywords.metaData,
  "writeOnly": keywords.metaData
});

Schema.add(formatMetaSchema);

Schema.add(contentMetaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/content", {
  "contentEncoding": keywords.metaData,
  "contentMediaType": keywords.metaData,
  "contentSchema": keywords.metaData
});

Schema.add(metaSchema);
JsonSchema.addKeyword("https://json-schema.org/draft/2019-09/schema#validate", keywords.validate);
