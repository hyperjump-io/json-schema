import jsonStringify from "fastest-stable-stringify";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/uniqueItems";

const compile = (schema) => Browser.value(schema);

const interpret = (uniqueItems, instance) => {
  if (instance.typeOf() !== "array" || uniqueItems === false) {
    return true;
  }

  const normalizedItems = instance.value().map(jsonStringify);
  return new Set(normalizedItems).size === normalizedItems.length;
};

export default { id, compile, interpret };
