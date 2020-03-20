const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("./keywords");
const metaSchema = require("../meta/oas/3.1/meta/schema-object/2019-10");
const validationMetaSchema = require("../meta/oas/3.1/meta/validation/2019-10");
const extensionsMetaSchema = require("../meta/oas/3.1/meta/extensions/2019-10");


const schemaVersion = "https://spec.openapis.org/oas/3.1/meta/schema-object/2019-10";

Schema.setConfig(schemaVersion, "keywordReference", true);
Schema.setConfig(schemaVersion, "keywordRecursiveReference", true);
Schema.setConfig(schemaVersion, "idToken", "$id");
Schema.setConfig(schemaVersion, "anchorToken", "$anchor");

Schema.add(JSON.parse(validationMetaSchema));
JsonSchema.defineVocabulary("https://spec.openapis.org/oas/3.1/vocab/validation/2019-10", {
  "const": keywords.const,
  "dependentRequired": keywords.dependentRequired,
  "enum": keywords.enum,
  "maxItems": keywords.maxItems,
  "maxLength": keywords.maxLength6,
  "maxProperties": keywords.maxProperties,
  "minItems": keywords.minItems,
  "minLength": keywords.minLength6,
  "minProperties": keywords.minProperties,
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
  "exclusiveMaximum": keywords.exclusiveMaximumOas31,
  "exclusiveMinimum": keywords.exclusiveMinimumOas31,
  "externalDocs": keywords.metaData,
  "maximum": keywords.maximumExclusiveMaximumOas31,
  "minimum": keywords.minimumExclusiveMinimumOas31,
  "nullable": keywords.metaData,
  "xml": keywords.metaData
});

Schema.add(JSON.parse(metaSchema));
JsonSchema.addKeyword(`${schemaVersion}#validate`, keywords.validate);
JsonSchema.addVocabulary(schemaVersion, "https://json-schema.org/draft/2019-09/vocab/core");
JsonSchema.addVocabulary(schemaVersion, "https://json-schema.org/draft/2019-09/vocab/applicator");
JsonSchema.addVocabulary(schemaVersion, "https://json-schema.org/draft/2019-09/vocab/meta-data");
JsonSchema.addVocabulary(schemaVersion, "https://json-schema.org/draft/2019-09/vocab/content");
JsonSchema.addVocabulary(schemaVersion, "https://spec.openapis.org/oas/3.1/vocab/validation/2019-10");
JsonSchema.addVocabulary(schemaVersion, "https://spec.openapis.org/oas/3.1/vocab/extensions/2019-10");
