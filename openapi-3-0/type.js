import * as Browser from "@hyperjump/browser";
import { getKeywordName } from "../lib/experimental.js";


const id = "https://spec.openapis.org/oas/3.0/keyword/type";

const compile = async (schema, _ast, parentSchema) => {
  const nullableKeyword = getKeywordName(schema.document.dialectId, "https://spec.openapis.org/oas/3.0/keyword/nullable");
  const nullable = await Browser.step(nullableKeyword, parentSchema);
  return Browser.value(nullable) === true ? ["null", Browser.value(schema)] : Browser.value(schema);
};

const interpret = (type, instance) => typeof type === "string"
  ? isTypeOf(instance)(type)
  : type.some(isTypeOf(instance));

const isTypeOf = (instance) => (type) => type === "integer"
  ? instance.typeOf() === "number" && Number.isInteger(instance.value())
  : instance.typeOf() === type;

export default { id, compile, interpret };
