const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const exclusiveMaximumSchema = await Schema.step("exclusiveMaximum", parentSchema);
  const exclusiveMaximum = Schema.value(exclusiveMaximumSchema);
  const isExclusive = typeof exclusiveMaximum === "boolean" ? exclusiveMaximum : false;

  return [Schema.value(schema), isExclusive];
};

const interpret = ([maximum, isExclusive], instance) => {
  const value = Instance.value(instance);
  if (typeof value !== "number") {
    return true;
  }

  return isExclusive ? value < maximum : value <= maximum;
};

module.exports = { compile, interpret };
