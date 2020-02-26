const Schema = require("../schema");


const compile = (schema) => Schema.value(schema);
const interpret = () => true;

module.exports = { compile, interpret };
