import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/exclusiveMinimum";

const compile = (schema) => Browser.value(schema);
const interpret = (exclusiveMinimum, instance) => Instance.typeOf(instance) !== "number" || Instance.value(instance) > exclusiveMinimum;

const description = "The exclusiveMinimum keyword is used to set an exclusive lower limit on numeric instances. Read more: https://www.learnjsonschema.com/2020-12/validation/exclusiveminimum/";

export default { id, compile, interpret, description };
