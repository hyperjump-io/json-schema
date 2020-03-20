const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("./keywords");
const metaSchema = require("../meta/draft-06/schema");


const schemaVersion = "http://json-schema.org/draft-06/schema";

Schema.setConfig(schemaVersion, "jsonReference", true);
Schema.setConfig(schemaVersion, "idToken", "$id");
Schema.setConfig(schemaVersion, "anchorToken", "$id");

Schema.add(JSON.parse(metaSchema));
JsonSchema.addKeyword(`${schemaVersion}#validate`, keywords.validate);
JsonSchema.addKeyword(`${schemaVersion}#additionalItems`, keywords.additionalItems6);
JsonSchema.addKeyword(`${schemaVersion}#additionalProperties`, keywords.additionalProperties6);
JsonSchema.addKeyword(`${schemaVersion}#allOf`, keywords.allOf);
JsonSchema.addKeyword(`${schemaVersion}#anyOf`, keywords.anyOf);
JsonSchema.addKeyword(`${schemaVersion}#const`, keywords.const);
JsonSchema.addKeyword(`${schemaVersion}#contains`, keywords.contains);
JsonSchema.addKeyword(`${schemaVersion}#default`, keywords.metaData);
JsonSchema.addKeyword(`${schemaVersion}#definitions`, keywords.definitions);
JsonSchema.addKeyword(`${schemaVersion}#dependencies`, keywords.dependencies);
JsonSchema.addKeyword(`${schemaVersion}#description`, keywords.metaData);
JsonSchema.addKeyword(`${schemaVersion}#enum`, keywords.enum);
JsonSchema.addKeyword(`${schemaVersion}#examples`, keywords.metaData);
JsonSchema.addKeyword(`${schemaVersion}#exclusiveMaximum`, keywords.exclusiveMaximum);
JsonSchema.addKeyword(`${schemaVersion}#exclusiveMinimum`, keywords.exclusiveMinimum);
JsonSchema.addKeyword(`${schemaVersion}#format`, keywords.metaData);
JsonSchema.addKeyword(`${schemaVersion}#items`, keywords.items);
JsonSchema.addKeyword(`${schemaVersion}#maxItems`, keywords.maxItems);
JsonSchema.addKeyword(`${schemaVersion}#maxLength`, keywords.maxLength6);
JsonSchema.addKeyword(`${schemaVersion}#maxProperties`, keywords.maxProperties);
JsonSchema.addKeyword(`${schemaVersion}#maximum`, keywords.maximum);
JsonSchema.addKeyword(`${schemaVersion}#minItems`, keywords.minItems);
JsonSchema.addKeyword(`${schemaVersion}#minLength`, keywords.minLength6);
JsonSchema.addKeyword(`${schemaVersion}#minProperties`, keywords.minProperties);
JsonSchema.addKeyword(`${schemaVersion}#minimum`, keywords.minimum);
JsonSchema.addKeyword(`${schemaVersion}#multipleOf`, keywords.multipleOf);
JsonSchema.addKeyword(`${schemaVersion}#not`, keywords.not);
JsonSchema.addKeyword(`${schemaVersion}#oneOf`, keywords.oneOf);
JsonSchema.addKeyword(`${schemaVersion}#pattern`, keywords.pattern);
JsonSchema.addKeyword(`${schemaVersion}#patternProperties`, keywords.patternProperties);
JsonSchema.addKeyword(`${schemaVersion}#properties`, keywords.properties);
JsonSchema.addKeyword(`${schemaVersion}#propertyNames`, keywords.propertyNames);
JsonSchema.addKeyword(`${schemaVersion}#required`, keywords.required);
JsonSchema.addKeyword(`${schemaVersion}#title`, keywords.metaData);
JsonSchema.addKeyword(`${schemaVersion}#type`, keywords.type);
JsonSchema.addKeyword(`${schemaVersion}#uniqueItems`, keywords.uniqueItems);
