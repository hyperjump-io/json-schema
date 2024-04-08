import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/minimum";

const compile = (schema) => Browser.value(schema);
const interpret = (minimum, instance) => Instance.typeOf(instance) !== "number" || Instance.value(instance) >= minimum;

const description = "The minimum keyword is used to set the lower limit on numeric instances. Read more: https://www.learnjsonschema.com/2020-12/validation/minimum/";

export default { id, compile, interpret, description };
