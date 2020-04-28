const { Schema, Instance } = require("@hyperjump/json-schema-core");
const jsonStringify = require("fastest-stable-stringify");


const compile = (schema) => Schema.value(schema);

const interpret = (uniqueItems, instance) => {
  const value = Instance.value(instance);
  if (!Array.isArray(value) || uniqueItems === false) {
    return true;
  }

  const normalizedItems = Instance.map((item) => jsonStringify(Instance.value(item)), instance);
  return (new Set(normalizedItems)).size === normalizedItems.length;
};

module.exports = { compile, interpret };
