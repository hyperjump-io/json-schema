import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/exclusiveMaximum";

const compile = (schema) => Browser.value(schema);
const interpret = (exclusiveMaximum, instance) => Instance.typeOf(instance) !== "number" || Instance.value(instance) < exclusiveMaximum;

const description = "The exclusiveMaximum keyword is used to set an exclusive upper limit on numeric instances. Read more: https://www.learnjsonschema.com/2020-12/validation/exclusivemaximum/";

export default { id, compile, interpret, description };
