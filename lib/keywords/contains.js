import { pipe, filter, reduce, zip, range, map, collectSet } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { getKeywordName, Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/contains";

const compile = async (schema, ast, parentSchema) => {
  const contains = await Validation.compile(schema, ast);

  const minContainsKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/minContains");
  const minContainsSchema = await Browser.step(minContainsKeyword, parentSchema);
  const minContains = Browser.typeOf(minContainsSchema) === "number" ? Browser.value(minContainsSchema) : 1;

  const maxContainsKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/maxContains");
  const maxContainsSchema = await Browser.step(maxContainsKeyword, parentSchema);
  const maxContains = Browser.typeOf(maxContainsSchema) === "number" ? Browser.value(maxContainsSchema) : Number.MAX_SAFE_INTEGER;

  return { contains, minContains, maxContains };
};

const interpret = ({ contains, minContains, maxContains }, instance, ast, dynamicAnchors, quiet) => {
  const matches = instance.typeOf() !== "array" || pipe(
    instance.iter(),
    filter((item) => Validation.interpret(contains, item, ast, dynamicAnchors, quiet)),
    reduce((matches) => matches + 1, 0)
  );
  return matches >= minContains && matches <= maxContains;
};

const collectEvaluatedItems = (keywordValue, instance, ast, dynamicAnchors) => {
  return interpret(keywordValue, instance, ast, dynamicAnchors, true)
    && instance.typeOf() === "array"
    && pipe(
      zip(instance.iter(), range(0)),
      filter(([item]) => Validation.interpret(keywordValue.contains, item, ast, dynamicAnchors, true)),
      map(([, itemIndex]) => itemIndex),
      collectSet
    );
};

export default { id, compile, interpret, collectEvaluatedItems };
