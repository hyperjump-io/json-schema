const Core = require("../core");
const Schema = require("../schema");
const Json = require("../json");


const compile = async (schema, ast) => {
  let itemsValue;
  try {
    const itemsSchema = await Schema.sibling("items", schema);
    itemsValue = Schema.value(itemsSchema);
  } catch (error) {}
  const numberOfItems = Array.isArray(itemsValue) ? itemsValue.length : Number.MAX_SAFE_INTEGER;

  return [numberOfItems, await Core.compileSchema(schema, ast)];
};

const interpret = ([numberOfItems, additionalItems], json, ast) => {
  if (!Array.isArray(Json.value(json))) {
    return true;
  }

  return Json.every((item, ndx) => ndx < numberOfItems || Core.interpretSchema(additionalItems, item, ast), json);
};

module.exports = { compile, interpret };
