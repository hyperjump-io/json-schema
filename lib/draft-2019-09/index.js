const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("../keywords");
const metaSchema = require("./meta/schema.schema.json");


Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "keywordReference", true);
Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "keywordRecursiveReference", true);
Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "idToken", "$id");
Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "anchorToken", "$anchor");

require("./vocab/core");
require("./vocab/applicator");
require("./vocab/validation");
require("./vocab/meta-data");
require("./vocab/format");
require("./vocab/content");

Schema.add(metaSchema);
JsonSchema.addKeyword("https://json-schema.org/draft/2019-09/schema#validate", keywords.validate);
