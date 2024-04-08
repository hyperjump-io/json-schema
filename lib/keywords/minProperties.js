import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minProperties";

const compile = (schema) => Browser.value(schema);
const interpret = (minProperties, instance) => {
  return instance.typeOf() !== "object" || [...instance.keys()].length >= minProperties;
};

const description = "The minProperties keyword is used to specify the inclusive minimum number of properties allowed in an object instnace. Read more: https://www.learnjsonschema.com/2020-12/validation/minproperties/";

export default { id, compile, interpret, description };
