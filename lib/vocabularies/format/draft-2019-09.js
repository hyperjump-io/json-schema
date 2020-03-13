const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/draft-2019-09.json");


Schema.add(metaSchema);
