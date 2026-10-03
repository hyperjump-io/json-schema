import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";
import { deterministicStringify } from "../common.js";


const id = "https://json-schema.org/keyword/enum";

const compile = (schema) => pipe(
  Browser.iter(schema),
  asyncMap(Browser.value),
  asyncMap(deterministicStringify),
  asyncCollectArray
);

const interpret = (enum_, instance) => enum_.includes(deterministicStringify(Instance.value(instance)));

export default { id, compile, interpret };
