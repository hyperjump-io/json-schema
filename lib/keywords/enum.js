import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";
import { deterministicStringify } from "../common.js";
import { Reference } from "@hyperjump/browser/jref";


const id = "https://json-schema.org/keyword/enum";

const compile = (schema) => {
  return Browser.value(schema).map((value) => {
    return deterministicStringify(value instanceof Reference ? value.toJSON() : value);
  });
};

const interpret = (enum_, instance) => enum_.includes(deterministicStringify(Instance.value(instance)));

export default { id, compile, interpret };
