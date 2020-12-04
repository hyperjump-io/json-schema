const { Core, Schema, Instance } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const items = await Schema.step("items", parentSchema);
  const numberOfItems = Schema.typeOf(items, "array") ? Schema.length(items) : Number.MAX_SAFE_INTEGER;

  if (Schema.typeOf(schema, "boolean")) {
    return [numberOfItems, Schema.value(schema)];
  } else {
    return [numberOfItems, await Core.compileSchema(schema, ast)];
  }
};

const interpret = ([numberOfItems, additionalItems], instance, ast, dynamicAnchors) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  if (typeof additionalItems === "string") {
    return Instance.every((item, ndx) => ndx < numberOfItems || Core.interpretSchema(additionalItems, item, ast, dynamicAnchors), instance);
  } else {
    return Instance.every((item, ndx) => ndx < numberOfItems ? true : additionalItems, instance);
  }
};

module.exports = { compile, interpret };
