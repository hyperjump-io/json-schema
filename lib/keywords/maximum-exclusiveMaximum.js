const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const exclusiveMaximum = await Schema.step("exclusiveMaximum", parentSchema);
  const isExclusive = Schema.value(exclusiveMaximum);

  return [Schema.value(schema), isExclusive];
};

const interpret = ([maximum, isExclusive], instance) => {
  if (!Instance.typeOf(instance, "number")) {
    return true;
  }

  const value = Instance.value(instance);
  return isExclusive ? value < maximum : value <= maximum;
};

module.exports = { compile, interpret };
