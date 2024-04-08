import { concat, join, empty, map, pipe } from "@hyperjump/pact";
import * as Browser from "@hyperjump/browser";
import { getKeywordName, Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/additionalProperties";
const description = `addtionalProperties validates against properties not matched by properties \
or patternProperties in the same sub-schema as additionalProperties.`;

const compile = async (schema, ast, parentSchema) => {
  const propertiesKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/properties");
  const propertiesSchema = await Browser.step(propertiesKeyword, parentSchema);
  const propertyPatterns = Browser.typeOf(propertiesSchema) === "object"
    ? map((propertyName) => "^" + regexEscape(propertyName) + "$", Browser.keys(propertiesSchema))
    : empty();

  const patternPropertiesKeyword = getKeywordName(schema.document.dialectId, "https://json-schema.org/keyword/patternProperties");
  const patternProperties = await Browser.step(patternPropertiesKeyword, parentSchema);
  const patternPropertyPatterns = Browser.typeOf(patternProperties) === "object"
    ? Browser.keys(patternProperties)
    : empty();

  const pattern = pipe(
    concat(propertyPatterns, patternPropertyPatterns),
    join("|")
  ) || "(?!)";

  return [new RegExp(pattern, "u"), await Validation.compile(schema, ast)];
};

const regexEscape = (string) => string
  .replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")
  .replace(/-/g, "\\x2d");

const interpret = ([isDefinedProperty, additionalProperties], instance, ast, dynamicAnchors, quiet) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  let isValid = true;
  for (const [propertyName, property] of instance.entries()) {
    if (!isDefinedProperty.test(propertyName.value()) && !Validation.interpret(additionalProperties, property, ast, dynamicAnchors, quiet)) {
      isValid = false;
    }
  }

  return isValid;
};

const collectEvaluatedProperties = ([isDefinedProperty, additionalProperties], instance, ast, dynamicAnchors) => {
  if (instance.typeOf() !== "object") {
    return true;
  }

  const evaluatedPropertyNames = new Set();
  for (const [propertyName, property] of instance.entries()) {
    if (!isDefinedProperty.test(propertyName.value())) {
      if (!Validation.interpret(additionalProperties, property, ast, dynamicAnchors, true)) {
        return false;
      }

      evaluatedPropertyNames.add(propertyName.value());
    }
  }

  return evaluatedPropertyNames;
};

export default { id, compile, interpret, collectEvaluatedProperties, description };
