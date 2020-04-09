const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const itemsSchema = await Schema.step("items", parentSchema);
  const itemsValue = Schema.value(itemsSchema);
  const numberOfItems = Array.isArray(itemsValue) ? itemsValue.length : Number.MAX_SAFE_INTEGER;

  const value = Schema.value(schema);
  if (typeof value === "boolean") {
    return [numberOfItems, value];
  } else {
    return [numberOfItems, await Core.compileSchema(schema, ast)];
  }
};

const interpret = ([numberOfItems, additionalItems], instance, ast) => {
  if (!Array.isArray(Instance.value(instance))) {
    return true;
  }

  if (typeof additionalItems === "string") {
    return Instance.every((item, ndx) => ndx < numberOfItems || Core.interpretSchema(additionalItems, item, ast), instance);
  } else {
    return Instance.every((item, ndx) => ndx < numberOfItems ? true : additionalItems, instance);
  }
};

module.exports = { compile, interpret };
