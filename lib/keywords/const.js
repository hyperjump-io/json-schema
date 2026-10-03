import * as Browser from "@hyperjump/browser";
import { Reference } from "@hyperjump/browser/jref";
import * as Instance from "../instance.js";
import { deterministicStringify } from "../common.js";
import { getKeywordName } from "../keywords.js";


const id = "https://json-schema.org/keyword/const";

const compile = (schema, _ast, parentSchema) => {
  const constKeywordName = getKeywordName(schema.document.dialectId, id);
  const value = Browser.value(parentSchema)[constKeywordName];
  return deterministicStringify(value instanceof Reference ? value.toJSON() : value);
};

const interpret = (const_, instance) => deterministicStringify(Instance.value(instance)) === const_;

export default { id, compile, interpret };
