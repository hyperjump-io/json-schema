import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/exclusiveMaximum";

const compile = (schema) => Browser.value(schema);
const interpret = (exclusiveMaximum, instance) => instance.typeOf() !== "number" || instance.value() < exclusiveMaximum;

const description = "The exclusiveMaximum keyword is used to set an exclusive upper limit on numeric instances. Read more: https://www.learnjsonschema.com/2020-12/validation/exclusivemaximum/";

export default { id, compile, interpret, description };
