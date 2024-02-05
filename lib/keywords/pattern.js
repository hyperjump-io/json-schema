import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/pattern";

const compile = (schema) => new RegExp(Browser.value(schema), "u");
const interpret = (pattern, instance) => instance.typeOf() !== "string" || pattern.test(instance.value());

export default { id, compile, interpret };
