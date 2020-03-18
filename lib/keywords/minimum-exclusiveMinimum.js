const { Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema) => {
  let isExclusive;
  try {
    const exclusiveMinimum = await Schema.sibling("exclusiveMinimum", schema);
    isExclusive = Schema.value(exclusiveMinimum);
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
