const { JsonSchema, Schema, Keywords } = require("@hyperjump/json-schema-core");
const keywords = require("./keywords");

const metaSchema = require("./meta/schema.json");



Schema.setConfig("http://json-schema.org/draft-07/schema", "jsonReference", true);
Schema.setConfig("http://json-schema.org/draft-07/schema", "idToken", "$id");
Schema.setConfig("http://json-schema.org/draft-07/schema", "anchorToken", "$id");

Schema.add(metaSchema);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#validate", Keywords.validate);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#additionalItems", keywords.additionalItems);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#additionalProperties", keywords.additionalProperties);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#allOf", keywords.allOf);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#anyOf", keywords.anyOf);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#const", keywords.const);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#contains", keywords.contains);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#default", Keywords.metaData);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#definitions", keywords.definitions);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#dependencies", keywords.dependencies);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#description", Keywords.metaData);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#enum", keywords.enum);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#exclusiveMaximum", keywords.exclusiveMaximum);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#exclusiveMinimum", keywords.exclusiveMinimum);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#format", Keywords.metaData);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#if", keywords.ifThenElse);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#items", keywords.items);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#maxItems", keywords.maxItems);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#maxLength", keywords.maxLength);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#maxProperties", keywords.maxProperties);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#maximum", keywords.maximum);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#minItems", keywords.minItems);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#minLength", keywords.minLength);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#minProperties", keywords.minProperties);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#minimum", keywords.minimum);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#multipleOf", keywords.multipleOf);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#not", keywords.not);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#oneOf", keywords.oneOf);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#pattern", keywords.pattern);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#patternProperties", keywords.patternProperties);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#properties", keywords.properties);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#propertyNames", keywords.propertyNames);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#readOnly", Keywords.metaData);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#required", keywords.required);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#title", Keywords.metaData);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#type", keywords.type);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#uniqueItems", keywords.uniqueItems);
JsonSchema.addKeyword("http://json-schema.org/draft-07/schema#writeOnly", Keywords.metaData);
