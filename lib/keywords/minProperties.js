import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minProperties";

const compile = (schema) => Browser.value(schema);
const interpret = (minProperties, instance) => {
  return instance.typeOf() !== "object" || [...instance.keys()].length >= minProperties;
};

export default { id, compile, interpret };
