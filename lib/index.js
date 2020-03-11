const Core = require("./core");
const Schema = require("./schema");

const draft201909MetaSchema = require("./meta/draft-2019-09.json");
const validate = require("./keywords/validate");

// JSON Schema Draft-2019-09
require("./vocabularies/core/draft-2019-09");
require("./vocabularies/applicator/draft-2019-09");
require("./vocabularies/validation/draft-2019-09");
require("./vocabularies/meta-data/draft-2019-09");
require("./vocabularies/format/draft-2019-09");
require("./vocabularies/content/draft-2019-09");


Schema.add(draft201909MetaSchema);
Core.addKeyword("https://json-schema.org/draft/2019-09/schema#validate", validate);

module.exports = { ...Schema, ...Core };
