import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/dependentRequired";

const compile = (schema) => pipe(
  Browser.entries(schema),
  asyncMap(([key, dependentRequired]) => [key, Browser.value(dependentRequired)]),
  asyncCollectArray
);

const interpret = (dependentRequired, instance) => {
  return instance.typeOf() !== "object" || dependentRequired.every(([propertyName, required]) => {
    return !instance.has(propertyName) || required.every((key) => instance.has(key));
  });
};

export default { id, compile, interpret };
