import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/dependentRequired";

const compile = (schema) => pipe(
  Browser.entries(schema),
  asyncMap(([key, dependentRequired]) => [key, Browser.value(dependentRequired)]),
  asyncCollectArray
);

const interpret = (dependentRequired, instance) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  let isValid = true;
  for (const [propertyName, required] of dependentRequired) {
    if (instance.has(propertyName) && !required.every((key) => instance.has(key))) {
      isValid = false;
    }
  }

  return isValid;
};

export default { id, compile, interpret };
