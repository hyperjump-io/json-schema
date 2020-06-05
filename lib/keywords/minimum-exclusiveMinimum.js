const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const exclusiveMinimum = await Schema.step("exclusiveMinimum", parentSchema);
  const isExclusive = Schema.value(exclusiveMinimum);

  return [Schema.value(schema), isExclusive];
};

const interpret = ([minimum, isExclusive], instance) => {
  if (!Instance.typeOf(instance, "number")) {
    return true;
  }

  const value = Instance.value(instance);
  return isExclusive ? value > minimum : value >= minimum;
};

module.exports = { compile, interpret };
