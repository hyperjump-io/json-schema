const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("./keywords");
const metaSchema = require("../meta/oas/3.1/meta/schema-object/2019-10");
const validationMetaSchema = require("../meta/oas/3.1/meta/validation/2019-10");
const extensionsMetaSchema = require("../meta/oas/3.1/meta/extensions/2019-10");


Schema.add(JSON.parse(metaSchema));

Schema.add(JSON.parse(validationMetaSchema));
JsonSchema.defineVocabulary("https://spec.openapis.org/oas/3.1/vocab/validation/2019-10", {
  "const": keywords.const,
  "dependentRequired": keywords.dependentRequired,
  "enum": keywords.enum,
  "exclusiveMaximum": keywords.exclusiveMaximumOas31,
  "exclusiveMinimum": keywords.exclusiveMinimumOas31,
  "maxItems": keywords.maxItems,
  "maxLength": keywords.maxLength6,
  "maxProperties": keywords.maxProperties,
  "maximum": keywords.maximumExclusiveMaximumOas31,
  "minItems": keywords.minItems,
  "minLength": keywords.minLength6,
  "minProperties": keywords.minProperties,
  "minimum": keywords.minimumExclusiveMinimumOas31,
  "multipleOf": keywords.multipleOf,
  "pattern": keywords.pattern,
  "required": keywords.required,
  "type": keywords.type,
  "uniqueItems": keywords.uniqueItems
});

Schema.add(JSON.parse(extensionsMetaSchema));
JsonSchema.defineVocabulary("https://spec.openapis.org/oas/3.1/vocab/extensions/2019-10", {
  "discriminator": keywords.metaData,
  "example": keywords.metaData,
  "externalDocs": keywords.metaData,
  "nullable": keywords.metaData,
  "xml": keywords.metaData
});
