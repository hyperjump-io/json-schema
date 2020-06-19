const { Core } = require("@hyperjump/json-schema-core");


const compile = Core.compileSchema;
const interpret = Core.interpretSchema;
const collectEvaluatedProperties = Core.collectEvaluatedProperties;
const collectEvaluatedItems = Core.collectEvaluatedItems;

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
