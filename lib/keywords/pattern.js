import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/pattern";

const compile = (schema) => new RegExp(Browser.value(schema), "u");
const interpret = (pattern, instance) => instance.typeOf() !== "string" || pattern.test(instance.value());

const description = "The pattern keyword in JSON Schema is designed to define a regular expression pattern that a string value within an instance must adhere to. Read more: https://www.learnjsonschema.com/2020-12/validation/pattern/";

export default { id, compile, interpret, description };
