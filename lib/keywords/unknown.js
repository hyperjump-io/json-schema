import * as Browser from "@hyperjump/browser";
import * as Instance from "../../annotations/annotated-instance.js";
import { pointerSegments } from "@hyperjump/json-pointer";


const id = "https://json-schema.org/keyword/unknown";

const compile = (schema) => {
  const keywordName = [...pointerSegments(schema.cursor)].pop();
  return [keywordName, Browser.value(schema)];
};

const interpret = ([keywordName, value], instance, { annotations, schemaUri }) => {
  const keywordId = `${id}#${keywordName}`;
  annotations.push({
    keyword: keywordId,
    absoluteKeywordLocation: schemaUri,
    instanceLocation: Instance.uri(instance),
    annotation: value
  });
  return true;
};

export default { id, compile, interpret };
