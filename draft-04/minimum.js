import * as Browser from "@hyperjump/browser";
import { getKeywordName } from "../lib/experimental.js";


const id = "https://json-schema.org/keyword/draft-04/minimum";

const compile = async (schema, _ast, parentSchema) => {
  const exclusiveMinimumKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/draft-04/exclusiveMinimum");
  const exclusiveMinimum = await Browser.step(exclusiveMinimumKeyword, parentSchema);
  const isExclusive = Browser.value(exclusiveMinimum);

  return [Browser.value(schema), isExclusive];
};

const interpret = ([minimum, isExclusive], instance) => {
  if (instance.typeOf() !== "number") {
    return true;
  }

  const value = instance.value();
  return isExclusive ? value > minimum : value >= minimum;
};

export default { id, compile, interpret };
