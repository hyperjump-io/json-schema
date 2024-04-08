import * as Browser from "@hyperjump/browser";
import * as Instance from "../lib/instance.js";
import { getKeywordName } from "../lib/experimental.js";


const id = "https://json-schema.org/keyword/draft-04/minimum";

const compile = async (schema, _ast, parentSchema) => {
  const exclusiveMinimumKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/draft-04/exclusiveMinimum");
  const exclusiveMinimum = await Browser.step(exclusiveMinimumKeyword, parentSchema);
  const isExclusive = Browser.value(exclusiveMinimum);

  return [Browser.value(schema), isExclusive];
};

const interpret = ([minimum, isExclusive], instance) => {
  if (Instance.typeOf(instance) !== "number") {
    return true;
  }

  const value = Instance.value(instance);
  return isExclusive ? value > minimum : value >= minimum;
};

const description = "Validation succeeds if the numeric instance is greater than or equal to the given number. The behavior of this keyword is modified by the exclusiveMinimum keyword.";

export default { id, compile, interpret, description };
