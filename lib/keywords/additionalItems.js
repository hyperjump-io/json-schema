const { JsonSchema, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parent) => {
  let itemsValue;
  try {
    const itemsSchema = await Schema.step("items", parent);
    itemsValue = Schema.value(itemsSchema);
  } catch (error) {}
  const numberOfItems = Array.isArray(itemsValue) ? itemsValue.length : Number.MAX_SAFE_INTEGER;

  const value = Schema.value(schema);
  if (typeof value === "boolean") {
    return [numberOfItems, value];
  } else {
    return [numberOfItems, await JsonSchema.compileSchema(schema, ast)];
  }
};

const interpret = ([numberOfItems, additionalItems], instance, ast) => {
  if (!Array.isArray(Instance.value(instance))) {
    return true;
  }

  if (typeof additionalItems === "string") {
    return Instance.every((item, ndx) => ndx < numberOfItems || JsonSchema.interpretSchema(additionalItems, item, ast), instance);
  } else {
    return Instance.every((item, ndx) => ndx < numberOfItems ? true : additionalItems, instance);
  }
};

module.exports = { compile, interpret };
