const { Core, Schema, InvalidSchemaError } = require("@hyperjump/json-schema-core");
const Keywords = require("./keywords");

require("./draft-04");
require("./draft-06");
require("./draft-07");
require("./draft-2019-09");
require("./draft-2020-12");


module.exports = {
  add: Core.add,
  get: Schema.get,
  validate: Core.validate,
  compile: Core.compile,
  interpret: Core.interpret,
  setMetaOutputFormat: Core.setMetaOutputFormat,
  setShouldMetaValidate: Core.setShouldMetaValidate,
  FLAG: Core.FLAG,
  BASIC: Core.BASIC,
  DETAILED: Core.DETAILED,
  VERBOSE: Core.VERBOSE,
  Keywords: Keywords,
  InvalidSchemaError: InvalidSchemaError
};

