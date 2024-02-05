import jsonStringify from "fastest-stable-stringify";
import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/enum";

const compile = (schema) => pipe(
  Browser.iter(schema),
  asyncMap(Browser.value),
  asyncMap(jsonStringify),
  asyncCollectArray
);

const interpret = (enum_, instance) => {
  const instanceValue = jsonStringify(instance.value());
  return enum_.some((enumValue) => instanceValue === enumValue);
};

export default { id, compile, interpret };
