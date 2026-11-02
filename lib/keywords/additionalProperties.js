import { pipe, map, collectArray } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import * as Instance from "../instance.js";
import { getKeywordName, Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/additionalProperties";

const compile = async (schema, ast, parentSchema) => {
  const propertiesKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/properties");
  const propertiesSchema = await Browser.step(propertiesKeyword, parentSchema);
  const definedProperties = Browser.typeOf(propertiesSchema) === "object"
    ? collectArray(Browser.keys(propertiesSchema))
    : [];

  const patternPropertiesKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/patternProperties");
  const patternProperties = await Browser.step(patternPropertiesKeyword, parentSchema);
  const patterns = Browser.typeOf(patternProperties) === "object"
    ? pipe(
        Browser.keys(patternProperties),
        map((pattern) => new RegExp(pattern, "u")),
        collectArray
      )
    : [];

  return [definedProperties, patterns, await Validation.compile(schema, ast)];
};

const interpret = ([definedProperties, patterns, additionalProperties], instance, context) => {
  if (Instance.typeOf(instance) !== "object") {
    return true;
  }

  let isValid = true;
  for (const [propertyNameNode, property] of Instance.entries(instance)) {
    const propertyName = Instance.value(propertyNameNode);
    if (definedProperties.includes(propertyName) || patterns.some((pattern) => pattern.test(propertyName))) {
      continue;
    }

    if (!Validation.interpret(additionalProperties, property, context)) {
      isValid = false;
    }

    context.evaluatedProperties?.add(propertyName);
  }

  return isValid;
};

const simpleApplicator = true;

export default { id, compile, interpret, simpleApplicator };
