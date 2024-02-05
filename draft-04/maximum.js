import * as Browser from "@hyperjump/browser";
import { getKeywordName } from "../lib/experimental.js";


const id = "https://json-schema.org/keyword/draft-04/maximum";

const compile = async (schema, _ast, parentSchema) => {
  const exclusiveMaximumKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/draft-04/exclusiveMaximum");
  const exclusiveMaximum = await Browser.step(exclusiveMaximumKeyword, parentSchema);
  const isExclusive = Browser.value(exclusiveMaximum);

  return [Browser.value(schema), isExclusive];
};

const interpret = ([maximum, isExclusive], instance) => {
  if (instance.typeOf() !== "number") {
    return true;
  }

  const value = instance.value();
  return isExclusive ? value < maximum : value <= maximum;
};

export default { id, compile, interpret };
