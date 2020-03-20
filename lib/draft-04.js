const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("./keywords");
const metaSchema = require("../meta/draft-04/schema");
const metaHyperSchema = require("../meta/draft-04/hyper-schema");


// JSON Schema Draft-04
const schemaVersion = "http://json-schema.org/draft-04/schema";

Schema.setConfig(schemaVersion, "jsonReference", true);
Schema.setConfig(schemaVersion, "idToken", "id");
Schema.setConfig(schemaVersion, "anchorToken", "id");

Schema.add(JSON.parse(metaSchema));
JsonSchema.addKeyword(`${schemaVersion}#validate`, keywords.validate);
JsonSchema.addKeyword(`${schemaVersion}#additionalItems`, keywords.additionalItems);
JsonSchema.addKeyword(`${schemaVersion}#additionalProperties`, keywords.additionalProperties);
JsonSchema.addKeyword(`${schemaVersion}#allOf`, keywords.allOf);
JsonSchema.addKeyword(`${schemaVersion}#anyOf`, keywords.anyOf);
JsonSchema.addKeyword(`${schemaVersion}#default`, keywords.metaData);
JsonSchema.addKeyword(`${schemaVersion}#definitions`, keywords.definitions);
JsonSchema.addKeyword(`${schemaVersion}#dependencies`, keywords.dependencies);
JsonSchema.addKeyword(`${schemaVersion}#description`, keywords.metaData);
JsonSchema.addKeyword(`${schemaVersion}#enum`, keywords.enum);
JsonSchema.addKeyword(`${schemaVersion}#format`, keywords.metaData);
JsonSchema.addKeyword(`${schemaVersion}#items`, keywords.items);
JsonSchema.addKeyword(`${schemaVersion}#maxItems`, keywords.maxItems);
JsonSchema.addKeyword(`${schemaVersion}#maxLength`, keywords.maxLength);
JsonSchema.addKeyword(`${schemaVersion}#maxProperties`, keywords.maxProperties);
JsonSchema.addKeyword(`${schemaVersion}#maximum`, keywords.maximumExclusiveMaximum);
JsonSchema.addKeyword(`${schemaVersion}#minItems`, keywords.minItems);
JsonSchema.addKeyword(`${schemaVersion}#minLength`, keywords.minLength);
JsonSchema.addKeyword(`${schemaVersion}#minProperties`, keywords.minProperties);
JsonSchema.addKeyword(`${schemaVersion}#minimum`, keywords.minimumExclusiveMinimum);
JsonSchema.addKeyword(`${schemaVersion}#multipleOf`, keywords.multipleOf);
JsonSchema.addKeyword(`${schemaVersion}#not`, keywords.not);
JsonSchema.addKeyword(`${schemaVersion}#oneOf`, keywords.oneOf);
JsonSchema.addKeyword(`${schemaVersion}#pattern`, keywords.pattern);
JsonSchema.addKeyword(`${schemaVersion}#patternProperties`, keywords.patternProperties);
JsonSchema.addKeyword(`${schemaVersion}#properties`, keywords.properties);
JsonSchema.addKeyword(`${schemaVersion}#required`, keywords.required);
JsonSchema.addKeyword(`${schemaVersion}#title`, keywords.metaData);
JsonSchema.addKeyword(`${schemaVersion}#type`, keywords.type);
JsonSchema.addKeyword(`${schemaVersion}#uniqueItems`, keywords.uniqueItems);

// JSON Hyper-Schema Draft-04
const hyperSchemaVersion = "http://json-schema.org/draft-04/hyper-schema";

Schema.setConfig(hyperSchemaVersion, "jsonReference", true);
Schema.setConfig(hyperSchemaVersion, "idToken", "id");
Schema.setConfig(hyperSchemaVersion, "anchorToken", "id");

Schema.add(JSON.parse(metaHyperSchema));
JsonSchema.addKeyword(`${hyperSchemaVersion}#validate`, keywords.validate);
JsonSchema.addKeyword(`${hyperSchemaVersion}#additionalItems`, keywords.additionalItems);
JsonSchema.addKeyword(`${hyperSchemaVersion}#additionalProperties`, keywords.additionalProperties);
JsonSchema.addKeyword(`${hyperSchemaVersion}#allOf`, keywords.allOf);
JsonSchema.addKeyword(`${hyperSchemaVersion}#anyOf`, keywords.anyOf);
JsonSchema.addKeyword(`${hyperSchemaVersion}#default`, keywords.metaData);
JsonSchema.addKeyword(`${hyperSchemaVersion}#definitions`, keywords.definitions);
JsonSchema.addKeyword(`${hyperSchemaVersion}#dependencies`, keywords.dependencies);
JsonSchema.addKeyword(`${hyperSchemaVersion}#description`, keywords.metaData);
JsonSchema.addKeyword(`${hyperSchemaVersion}#enum`, keywords.enum);
JsonSchema.addKeyword(`${hyperSchemaVersion}#format`, keywords.metaData);
JsonSchema.addKeyword(`${hyperSchemaVersion}#fragmentResolution`, keywords.metaData);
JsonSchema.addKeyword(`${hyperSchemaVersion}#items`, keywords.items);
JsonSchema.addKeyword(`${hyperSchemaVersion}#maxItems`, keywords.maxItems);
JsonSchema.addKeyword(`${hyperSchemaVersion}#minProperties`, keywords.minProperties);
JsonSchema.addKeyword(`${hyperSchemaVersion}#maxProperties`, keywords.maxProperties);
JsonSchema.addKeyword(`${hyperSchemaVersion}#maximum`, keywords.maximumExclusiveMaximum);
JsonSchema.addKeyword(`${hyperSchemaVersion}#media`, keywords.metaData);
JsonSchema.addKeyword(`${hyperSchemaVersion}#minItems`, keywords.minItems);
JsonSchema.addKeyword(`${hyperSchemaVersion}#minLength`, keywords.minLength);
JsonSchema.addKeyword(`${hyperSchemaVersion}#maxLength`, keywords.maxLength);
JsonSchema.addKeyword(`${hyperSchemaVersion}#minimum`, keywords.minimumExclusiveMinimum);
JsonSchema.addKeyword(`${hyperSchemaVersion}#multipleOf`, keywords.multipleOf);
JsonSchema.addKeyword(`${hyperSchemaVersion}#links`, keywords.metaData);
JsonSchema.addKeyword(`${hyperSchemaVersion}#not`, keywords.not);
JsonSchema.addKeyword(`${hyperSchemaVersion}#oneOf`, keywords.oneOf);
JsonSchema.addKeyword(`${hyperSchemaVersion}#pathStart`, keywords.metaData);
JsonSchema.addKeyword(`${hyperSchemaVersion}#pattern`, keywords.pattern);
JsonSchema.addKeyword(`${hyperSchemaVersion}#patternProperties`, keywords.patternProperties);
JsonSchema.addKeyword(`${hyperSchemaVersion}#properties`, keywords.properties);
JsonSchema.addKeyword(`${hyperSchemaVersion}#readOnly`, keywords.metaData);
JsonSchema.addKeyword(`${hyperSchemaVersion}#required`, keywords.required);
JsonSchema.addKeyword(`${hyperSchemaVersion}#title`, keywords.metaData);
JsonSchema.addKeyword(`${hyperSchemaVersion}#type`, keywords.type);
JsonSchema.addKeyword(`${hyperSchemaVersion}#uniqueItems`, keywords.uniqueItems);
