import * as Pact from "@hyperjump/pact";
import { publishAsync, publish } from "../pubsub.js";
import { isExperimentalKeywordEnabled } from "../configuration.js";
import * as Instance from "../instance.js";
import { getKeywordId, getKeyword } from "../keywords.js";
import { toAbsoluteUri } from "../common.js";
import * as Schema from "../schema.js";


const id = "https://json-schema.org/evaluation/validate";

const compile = async (schema, ast) => {
  // Meta validation
  await publishAsync("validate.metaValidate", schema);

  // Dynamic Scope
  if (!(schema.id in ast.metaData)) {
    ast.metaData[schema.id] = {
      dynamicAnchors: schema.dynamicAnchors
    };
  }

  // Compile
  const url = Schema.uri(schema);
  if (!(url in ast)) {
    ast[url] = false; // Place dummy entry in ast to avoid recursive loops

    const schemaValue = Schema.value(schema);
    if (!["object", "boolean"].includes(typeof schemaValue)) {
      throw Error(`No schema found at '${url}'`);
    }

    ast[url] = [
      id,
      Schema.uri(schema),
      typeof schemaValue === "boolean" ? schemaValue : await Pact.pipeline([
        Schema.entries,
        Pact.map(async ([keyword, keywordSchema]) => {
          const keywordId = getKeywordId(schema.dialectId, keyword);
          if (!keywordId) {
            throw Error(`Encountered unknown keyword '${keyword}' at ${url}`);
          }

          const keywordHandler = getKeyword(keywordId);
          if (!keywordHandler) {
            throw Error(`Encountered unsupported keyword ${keyword} at '${url}'. You can provide an implementation for the '${keywordId}' keyword using the 'addKeyword' function.`);
          }
          if (keywordHandler.experimental && !isExperimentalKeywordEnabled(keywordId)) {
            throw Error(`Encountered experimental keyword ${keyword} at '${url}'. You can enable this keyword with: setExperimentalKeywordEnabled('${keywordId}', true)`);
          }

          const keywordAst = await keywordHandler.compile(keywordSchema, ast, schema);
          return [keywordId, Schema.uri(keywordSchema), keywordAst];
        }),
        Pact.all
      ], schema)
    ];
  }

  return url;
};

const interpret = (url, instance, ast, dynamicAnchors) => {
  const [keywordId, schemaUrl, nodes] = ast[url];

  dynamicAnchors = { ...ast.metaData[toAbsoluteUri(url)].dynamicAnchors, ...dynamicAnchors };

  publish("result.start");
  const isValid = typeof nodes === "boolean" ? nodes : nodes.every(([keywordId, schemaUrl, keywordValue]) => {
    publish("result.start");
    const isValid = getKeyword(keywordId).interpret(keywordValue, instance, ast, dynamicAnchors);

    publish("result", {
      keyword: keywordId,
      absoluteKeywordLocation: schemaUrl,
      instanceLocation: Instance.uri(instance),
      valid: isValid,
      ast: keywordValue
    });
    publish("result.end");
    return isValid;
  });

  publish("result", {
    keyword: keywordId,
    absoluteKeywordLocation: schemaUrl,
    instanceLocation: Instance.uri(instance),
    valid: isValid,
    ast: url
  });
  publish("result.end");
  return isValid;
};

const emptyPropertyNames = new Set();
const collectEvaluatedProperties = (url, instance, ast, dynamicAnchors, isTop = false) => {
  const nodes = ast[url][2];

  if (typeof nodes === "boolean") {
    return nodes ? [] : false;
  }

  const accumulatedPropertyNames = new Set();
  for (const [keywordId, , keywordValue] of nodes) {
    if (isTop && keywordId === "https://json-schema.org/keyword/unevaluatedProperties") {
      continue;
    }

    const keywordHandler = getKeyword(keywordId);
    const propertyNames = "collectEvaluatedProperties" in keywordHandler
      ? keywordHandler.collectEvaluatedProperties(keywordValue, instance, ast, dynamicAnchors, isTop)
      : keywordHandler.interpret(keywordValue, instance, ast, dynamicAnchors, isTop) && emptyPropertyNames;

    if (propertyNames === false) {
      return false;
    }

    propertyNames.forEach(Set.prototype.add.bind(accumulatedPropertyNames));
  }

  return accumulatedPropertyNames;
};

const emptyItemIndexes = new Set();
const collectEvaluatedItems = (url, instance, ast, dynamicAnchors, isTop = false) => {
  const nodes = ast[url][2];

  if (typeof nodes === "boolean") {
    return nodes ? new Set() : false;
  }

  const accumulatedItemIndexes = new Set();
  for (const [keywordId, , keywordValue] of nodes) {
    if (isTop && keywordId === "https://json-schema.org/keyword/unevaluatedItems") {
      continue;
    }

    const keywordHandler = getKeyword(keywordId);
    const itemIndexes = "collectEvaluatedItems" in keywordHandler
      ? keywordHandler.collectEvaluatedItems(keywordValue, instance, ast, dynamicAnchors, isTop)
      : keywordHandler.interpret(keywordValue, instance, ast, dynamicAnchors, isTop) && emptyItemIndexes;

    if (itemIndexes === false) {
      return false;
    }

    itemIndexes.forEach(Set.prototype.add.bind(accumulatedItemIndexes));
  }

  return accumulatedItemIndexes;
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
