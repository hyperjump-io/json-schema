const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  let isExclusive;
  try {
    const exclusiveMinimum = await Schema.step("exclusiveMinimum", parentSchema);
    const value = Schema.value(exclusiveMinimum);
    isExclusive = typeof value === "boolean" ? value : false;
  } catch (error) {
    isExclusive = false;
  }
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
