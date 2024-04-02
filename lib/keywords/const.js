import jsonStringify from "json-stringify-deterministic";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/const";

const compile = (schema) => jsonStringify(Browser.value(schema));
const interpret = (const_, instance) => jsonStringify(instance.value()) === const_;

export default { id, compile, interpret };
