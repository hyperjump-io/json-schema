import jsonStringify from "json-stringify-deterministic";
import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";


const id = "https://json-schema.org/keyword/enum";

const compile = (schema) => pipe(
  Browser.iter(schema),
  asyncMap(Browser.value),
  asyncMap(jsonStringify),
  asyncCollectArray
);

const interpret = (enum_, instance) => {
  const instanceValue = jsonStringify(Instance.value(instance));
  return enum_.some((enumValue) => instanceValue === enumValue);
};

const description = "Validation succeeds if the instance is equal to one of the elements in this keyword’s array value. Read more: https://www.learnjsonschema.com/2020-12/validation/enum/";

export default { id, compile, interpret, description };
