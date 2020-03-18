const { Schema } = require("@hyperjump/json-schema-core");

const metaSchema = require("../meta/meta/format.schema.json");


Schema.add(metaSchema);
