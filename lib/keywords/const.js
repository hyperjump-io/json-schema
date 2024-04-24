import jsonStringify from "json-stringify-deterministic";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/const";

const compile = (schema) => jsonStringify(Browser.value(schema));
const interpret = (const_, instance) => jsonStringify(instance.value()) === const_;

const description = "The const keyword in restricts an instance to a specific value. Read more: https://www.learnjsonschema.com/2020-12/validation/const/";

export default { id, compile, interpret, description };
