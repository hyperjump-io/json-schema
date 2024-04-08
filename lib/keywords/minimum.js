import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minimum";

const compile = (schema) => Browser.value(schema);
const interpret = (minimum, instance) => instance.typeOf() !== "number" || instance.value() >= minimum;

const description = "The minimum keyword is used to set the lower limit on numeric instances. Read more: https://www.learnjsonschema.com/2020-12/validation/minimum/";

export default { id, compile, interpret, description };
