import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maxProperties";

const compile = (schema) => Browser.value(schema);
const interpret = (maxProperties, instance) => {
  return instance.typeOf() !== "object" || [...instance.keys()].length <= maxProperties;
};

export default { id, compile, interpret };
