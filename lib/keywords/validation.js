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
      throw Error(`No schema found at '${Schema.uri(schema)}'`);
    }

    ast[url] = [
      id,
      Schema.uri(schema),
      typeof schemaValue === "boolean" ? schemaValue : await Pact.pipeline([
        Schema.entries,
        Pact.map(async ([keyword, keywordSchema]) => {
          const keywordId = getKeywordId(schema.dialectId, keyword);
          if (!keywordId) {
            throw Error(`Encountered unknown keyword '${keyword}' at ${Schema.uri(schema)}`);
          }

          const keywordHandler = getKeyword(keywordId);
          if (keywordHandler.experimental && !isExperimentalKeywordEnabled(keywordId)) {
            throw Error(`Encountered experimental keyword ${keyword} at '${Schema.uri(schema)}'. You can enable this keyword with: setExperimentalKeywordEnabled('${keywordId}', true)`);
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

const collectEvaluatedProperties = (url, instance, ast, dynamicAnchors, isTop = false) => {
  const nodes = ast[url][2];

  if (typeof nodes === "boolean") {
    return nodes ? [] : false;
  }

  return nodes
    .filter(([keywordId]) => !isTop || keywordId !== "https://json-schema.org/keyword/unevaluatedProperties")
    .reduce((acc, [keywordId, , keywordValue]) => {
      const propertyNames = acc && getKeyword(keywordId).collectEvaluatedProperties(keywordValue, instance, ast, dynamicAnchors);
      return propertyNames !== false && [...acc, ...propertyNames];
    }, []);
};

const collectEvaluatedItems = (url, instance, ast, dynamicAnchors, isTop = false) => {
  const nodes = ast[url][2];

  if (typeof nodes === "boolean") {
    return nodes ? new Set() : false;
  }

  return nodes
    .filter(([keywordId]) => !isTop || keywordId !== "https://json-schema.org/keyword/unevaluatedItems")
    .reduce((acc, [keywordId, , keywordValue]) => {
      const itemIndexes = acc !== false && getKeyword(keywordId).collectEvaluatedItems(keywordValue, instance, ast, dynamicAnchors);
      return itemIndexes !== false && new Set([...acc, ...itemIndexes]);
    }, new Set());
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
