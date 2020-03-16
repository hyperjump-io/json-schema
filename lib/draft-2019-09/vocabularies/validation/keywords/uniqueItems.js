const { Schema, Json } = require("@hyperjump/json-schema-core");
const jsonStringify = require("fastest-stable-stringify");


const compile = (schema) => Schema.value(schema);

const interpret = (uniqueItems, json) => {
  if (uniqueItems === false) {
    return true;
  }

  const normalizedItems = Json.map((item) => jsonStringify(Json.value(item)), json);
  return (new Set(normalizedItems)).size === normalizedItems.length;
};

module.exports = { compile, interpret };
