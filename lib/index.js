const Core = require("./core");
const Schema = require("./schema");

const draft201909MetaSchema = require("./meta/draft-2019-09/schema.json");
const draft201909CoreMetaSchema = require("./meta/draft-2019-09/meta/core.json");
const draft201909ApplicatorMetaSchema = require("./meta/draft-2019-09/meta/applicator.json");
const draft201909ValidationMetaSchema = require("./meta/draft-2019-09/meta/validation.json");
const draft201909MetaDataMetaSchema = require("./meta/draft-2019-09/meta/meta-data.json");
const draft201909FormatMetaSchema = require("./meta/draft-2019-09/meta/format.json");
const draft201909ContentMetaSchema = require("./meta/draft-2019-09/meta/content.json");

const additionalItems = require("./keywords/additionalItems");
const additionalProperties = require("./keywords/additionalProperties");
const allOf = require("./keywords/allOf");
const anyOf = require("./keywords/anyOf");
const const_ = require("./keywords/const");
const contains = require("./keywords/contains");
const defs = require("./keywords/defs");
const dependentRequired = require("./keywords/dependentRequired");
const dependentSchemas = require("./keywords/dependentSchemas");
const enum_ = require("./keywords/enum");
const exclusiveMaximum = require("./keywords/exclusiveMaximum");
const exclusiveMinimum = require("./keywords/exclusiveMinimum");
const ifThenElse = require("./keywords/if-then-else");
const items = require("./keywords/items");
const maxItems = require("./keywords/maxItems");
const maxLength = require("./keywords/maxLength");
const maxProperties = require("./keywords/maxProperties");
const maximum = require("./keywords/maximum");
const metaData = require("./keywords/meta-data");
const minItems = require("./keywords/minItems");
const minLength = require("./keywords/minLength");
const minProperties = require("./keywords/minProperties");
const minimum = require("./keywords/minimum");
const multipleOf = require("./keywords/multipleOf");
const not = require("./keywords/not");
const oneOf = require("./keywords/oneOf");
const pattern = require("./keywords/pattern");
const patternProperties = require("./keywords/patternProperties");
const properties = require("./keywords/properties");
const propertyNames = require("./keywords/propertyNames");
const recuriveRef = require("./keywords/recursiveRef");
const ref = require("./keywords/ref");
const required = require("./keywords/required");
const type = require("./keywords/type");
const uniqueItems = require("./keywords/uniqueItems");
const validate = require("./keywords/validate");


// JSON Schema Draft-2019-09
Schema.add(draft201909MetaSchema);
Schema.add(draft201909CoreMetaSchema);
Schema.add(draft201909ApplicatorMetaSchema);
Schema.add(draft201909ValidationMetaSchema);
Schema.add(draft201909MetaDataMetaSchema);
Schema.add(draft201909FormatMetaSchema);
Schema.add(draft201909ContentMetaSchema);

Core.addVocabulary("https://json-schema.org/draft/2019-09/vocab/core", {
  "$comment": metaData,
  "$defs": defs,
  "$recursiveRef": recuriveRef,
  "$ref": ref
});

Core.addVocabulary("https://json-schema.org/draft/2019-09/vocab/applicator", {
  "additionalItems": additionalItems,
  "additionalProperties": additionalProperties,
  "allOf": allOf,
  "anyOf": anyOf,
  "contains": contains,
  "dependentSchemas": dependentSchemas,
  "if": ifThenElse,
  "items": items,
  "not": not,
  "oneOf": oneOf,
  "patternProperties": patternProperties,
  "properties": properties,
  "propertyNames": propertyNames
});

Core.addVocabulary("https://json-schema.org/draft/2019-09/vocab/validation", {
  "const": const_,
  "dependentRequired": dependentRequired,
  "enum": enum_,
  "exclusiveMaximum": exclusiveMaximum,
  "exclusiveMinimum": exclusiveMinimum,
  "maxItems": maxItems,
  "maxLength": maxLength,
  "maxProperties": maxProperties,
  "maximum": maximum,
  "minItems": minItems,
  "minLength": minLength,
  "minProperties": minProperties,
  "minimum": minimum,
  "multipleOf": multipleOf,
  "pattern": pattern,
  "required": required,
  "type": type,
  "uniqueItems": uniqueItems
});

Core.addVocabulary("https://json-schema.org/draft/2019-09/vocab/meta-data", {
  "default": metaData,
  "deprecated": metaData,
  "description": metaData,
  "examples": metaData,
  "readOnly": metaData,
  "title": metaData,
  "writeOnly": metaData
});

Core.addVocabulary("https://json-schema.org/draft/2019-09/vocab/content", {
  "contentEncoding": metaData,
  "contentMediaType": metaData,
  "contentSchema": metaData
});

Core.addSchemaVersion("https://json-schema.org/draft/2019-09/schema", validate, [
  "https://json-schema.org/draft/2019-09/vocab/core",
  "https://json-schema.org/draft/2019-09/vocab/applicator",
  "https://json-schema.org/draft/2019-09/vocab/validation",
  "https://json-schema.org/draft/2019-09/vocab/meta-data",
  "https://json-schema.org/draft/2019-09/vocab/content"
]);

module.exports = { ...Schema, ...Core };
