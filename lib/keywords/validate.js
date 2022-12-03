import * as Pact from "@hyperjump/pact";
import * as PubSub from "../pubsub.js";
import * as Configuration from "../configuration.js";
import * as Instance from "../instance.js";
import * as Keywords from "../keywords.js";
import { resolveUrl } from "../common.js";
import * as Schema from "../schema.js";


const id = "https://json-schema.org/evaluation/validate";

const compile = async (schema, ast) => {
  // Meta validation
  await PubSub.publishAsync("validate.metaValidate", schema);

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
          const keywordId = Keywords.getKeywordId(schema.dialectId, keyword);
          if (!keywordId) {
            throw Error(`Encountered unknown keyword '${keyword}' at ${Schema.uri(schema)}`);
          }

          const keywordHandler = Keywords.getKeyword(keywordId);
          if (keywordHandler.unstable && !Configuration.isUnstableKeywordEnabled(keywordId)) {
            throw Error(`Encountered unstable keyword ${keyword} at '${Schema.uri(schema)}'. You can enable this keyword with: setUnstableKeywordEnabled('${keywordId}', true)`);
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

const interpret = (uri, instance, ast, dynamicAnchors) => {
  const [keywordId, schemaUrl, nodes] = ast[uri];

  dynamicAnchors = { ...ast.metaData[resolveUrl(uri, "")].dynamicAnchors, ...dynamicAnchors };

  PubSub.publish("result.start");
  const isValid = typeof nodes === "boolean" ? nodes : nodes
    .every(([keywordId, schemaUrl, keywordValue]) => {
      PubSub.publish("result.start");
      const isValid = Keywords.getKeyword(keywordId).interpret(keywordValue, instance, ast, dynamicAnchors);

      PubSub.publish("result", {
        keyword: keywordId,
        absoluteKeywordLocation: schemaUrl,
        instanceLocation: Instance.uri(instance),
        valid: isValid,
        ast: keywordValue
      });
      PubSub.publish("result.end");
      return isValid;
    });

  PubSub.publish("result", {
    keyword: keywordId,
    absoluteKeywordLocation: schemaUrl,
    instanceLocation: Instance.uri(instance),
    valid: isValid,
    ast: uri
  });
  PubSub.publish("result.end");
  return isValid;
};

const collectEvaluatedProperties = (uri, instance, ast, dynamicAnchors, isTop = false) => {
  const nodes = ast[uri][2];

  if (typeof nodes === "boolean") {
    return nodes ? [] : false;
  }

  return nodes
    .filter(([keywordId]) => !isTop || keywordId !== "https://json-schema.org/keyword/unevaluatedProperties")
    .reduce((acc, [keywordId, , keywordValue]) => {
      const propertyNames = acc && Keywords.getKeyword(keywordId).collectEvaluatedProperties(keywordValue, instance, ast, dynamicAnchors);
      return propertyNames !== false && [...acc, ...propertyNames];
    }, []);
};

const collectEvaluatedItems = (uri, instance, ast, dynamicAnchors, isTop = false) => {
  const nodes = ast[uri][2];

  if (typeof nodes === "boolean") {
    return nodes ? new Set() : false;
  }

  return nodes
    .filter(([keywordId]) => !isTop || keywordId !== "https://json-schema.org/keyword/unevaluatedItems")
    .reduce((acc, [keywordId, , keywordValue]) => {
      const itemIndexes = acc !== false && Keywords.getKeyword(keywordId).collectEvaluatedItems(keywordValue, instance, ast, dynamicAnchors);
      return itemIndexes !== false && new Set([...acc, ...itemIndexes]);
    }, new Set());
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
