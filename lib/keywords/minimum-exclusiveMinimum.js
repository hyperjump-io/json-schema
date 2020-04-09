const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const exclusiveMinimum = await Schema.step("exclusiveMinimum", parentSchema);
  const isExclusive = Schema.value(exclusiveMinimum);

  return [Schema.value(schema), isExclusive];
};

const interpret = ([minimum, isExclusive], instance) => {
  const value = Instance.value(instance);
  if (typeof value !== "number") {
    return true;
  }

  return isExclusive ? value > minimum : value >= minimum;
};

module.exports = { compile, interpret };
