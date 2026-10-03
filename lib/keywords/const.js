import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";
import { deterministicStringify } from "../common.js";


const id = "https://json-schema.org/keyword/const";

const compile = (schema) => deterministicStringify(Browser.value(schema));
const interpret = (const_, instance) => deterministicStringify(Instance.value(instance)) === const_;

export default { id, compile, interpret };
