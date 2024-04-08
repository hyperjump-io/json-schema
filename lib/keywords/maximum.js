import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/maximum";

const compile = (schema) => Browser.value(schema);
const interpret = (maximum, instance) => Instance.typeOf(instance) !== "number" || Instance.value(instance) <= maximum;

const description = "The maximum keyword is used to set the upper limit on numeric instances. Read more: https://www.learnjsonschema.com/2020-12/validation/maximum/";

export default { id, compile, interpret, description };
