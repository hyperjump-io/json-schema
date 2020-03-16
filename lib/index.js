const { JsonSchema, Schema, Keywords } = require("@hyperjump/json-schema-core");

const draft201909MetaSchema = require("./draft-2019-09/meta/schema.json");
require("./draft-2019-09/vocabularies/core");
require("./draft-2019-09/vocabularies/applicator");
require("./draft-2019-09/vocabularies/validation");
require("./draft-2019-09/vocabularies/meta-data");
require("./draft-2019-09/vocabularies/format");
require("./draft-2019-09/vocabularies/content");


Schema.add(draft201909MetaSchema);
JsonSchema.addKeyword("https://json-schema.org/draft/2019-09/schema#validate", Keywords.validate);

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

