const { JsonSchema, Schema, Keywords } = require("@hyperjump/json-schema-core");
const metaSchema = require("./meta/schema.json");


Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "keywordReference", true);
Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "keywordRecursiveReference", true);
Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "idToken", "$id");
Schema.setConfig("https://json-schema.org/draft/2019-09/schema", "anchorToken", "$anchor");

require("./vocabularies/core");
require("./vocabularies/applicator");
require("./vocabularies/validation");
require("./vocabularies/meta-data");
require("./vocabularies/format");
require("./vocabularies/content");

Schema.add(metaSchema);
JsonSchema.addKeyword("https://json-schema.org/draft/2019-09/schema#validate", Keywords.validate);
