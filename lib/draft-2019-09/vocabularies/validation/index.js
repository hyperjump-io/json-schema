const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/validation.json");

const const_ = require("./keywords/const");
const dependentRequired = require("./keywords/dependentRequired");
const enum_ = require("./keywords/enum");
const exclusiveMaximum = require("./keywords/exclusiveMaximum");
const exclusiveMinimum = require("./keywords/exclusiveMinimum");
const maxItems = require("./keywords/maxItems");
const maxLength = require("./keywords/maxLength");
const maxProperties = require("./keywords/maxProperties");
const maximum = require("./keywords/maximum");
const minItems = require("./keywords/minItems");
const minLength = require("./keywords/minLength");
const minProperties = require("./keywords/minProperties");
const minimum = require("./keywords/minimum");
const multipleOf = require("./keywords/multipleOf");
const pattern = require("./keywords/pattern");
const required = require("./keywords/required");
const type = require("./keywords/type");
const uniqueItems = require("./keywords/uniqueItems");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/validation", {
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
