const Instance = require("../instance");
const Keywords = require("../keywords");
const Schema = require("../schema");


const id = "https://json-schema.org/keyword/requireAllExcept";
const unstable = true;

const compile = async (schema, ast, parentSchema) => {
  const requireAllExcept = await Schema.value(schema);
  const propertiesKeyword = Keywords.getKeywordName(schema.dialectId, "https://json-schema.org/keyword/properties");
  const propertiesSchema = await Schema.step(propertiesKeyword, parentSchema);
  const propertyNames = Schema.typeOf(propertiesSchema, "object") ? Schema.keys(propertiesSchema) : [];

  const required = new Set(propertyNames);
  requireAllExcept.forEach((propertyName) => propertyNames.remove(propertyName));
  return [...required];
};

const interpret = (required, instance) => {
  return !Instance.typeOf(instance, "object") || required.every((propertyName) => Instance.value(instance).hasOwnProperty(propertyName));
};

module.exports = { id, unstable, compile, interpret };
