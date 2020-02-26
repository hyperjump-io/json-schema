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

  const value = Schema.value(schema);
  if (typeof value === "boolean") {
    return [numberOfItems, value];
  } else {
    return [numberOfItems, await Core.compileSchema(schema, ast)];
  }
};

const interpret = ([numberOfItems, additionalItems], json, ast, results) => {
  if (!Array.isArray(Json.value(json))) {
    return true;
  }

  if (typeof additionalItems === "string") {
    return Json.every((item, ndx) => ndx < numberOfItems || Core.interpretSchema(additionalItems, item, ast, results), json);
  } else {
    return Json.every((item, ndx) => ndx < numberOfItems ? true : additionalItems, json);
  }
};

module.exports = { compile, interpret };
