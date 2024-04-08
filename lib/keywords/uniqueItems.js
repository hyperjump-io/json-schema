import jsonStringify from "json-stringify-deterministic";
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

const description = "The uniqueItems keyword is used to ensure that all the items in an array are unique. Read more: https://www.learnjsonschema.com/2020-12/validation/uniqueitems/";

export default { id, compile, interpret, description };
