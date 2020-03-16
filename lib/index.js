const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");

require("./draft-07");
require("./draft-2019-09");


module.exports = {
  add: Schema.add,
  get: Schema.get,
  validate: JsonSchema.validate,
  setMetaOutputFormat: JsonSchema.setMetaOutputFormat,
  FLAG: JsonSchema.FLAG,
  BASIC: JsonSchema.BASIC,
  DETAILED: JsonSchema.DETAILED,
  VERBOSE: JsonSchema.VERBOSE
};

