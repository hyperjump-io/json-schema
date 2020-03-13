const { JsonSchema, Schema, Keywords } = require("@hyperjump/json-schema-core");

const draft201909MetaSchema = require("./meta/draft-2019-09.json");
require("./vocabularies/core/draft-2019-09");
require("./vocabularies/applicator/draft-2019-09");
require("./vocabularies/validation/draft-2019-09");
require("./vocabularies/meta-data/draft-2019-09");
require("./vocabularies/format/draft-2019-09");
require("./vocabularies/content/draft-2019-09");


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

