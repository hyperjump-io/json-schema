import { value, entries } from "@hyperjump/browser";
import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import { append as pointerAppend } from "@hyperjump/json-pointer";
import { publishAsync } from "../pubsub.js";
import { toAbsoluteUri } from "../common.js";
import { canonicalUri, getKeyword, getKeywordByName } from "../experimental.js";


const id = "https://json-schema.org/evaluation/validate";

const compile = async (schema, ast) => {
  // Meta validation
  await publishAsync("validate.metaValidate", schema);

  // Dynamic Scope
  if (!(schema.document.baseUri in ast.metaData)) {
    ast.metaData[schema.document.baseUri] = {
      dynamicAnchors: schema.document.dynamicAnchors
    };
  }

  // Compile
  const url = canonicalUri(schema);
  if (!(url in ast)) {
    ast[url] = false; // Place dummy entry in ast to avoid recursive loops

    const schemaValue = value(schema);
    if (!["object", "boolean"].includes(typeof schemaValue)) {
      throw Error(`No schema found at '${url}'`);
    }

    ast[url] = typeof schemaValue === "boolean" ? schemaValue : await pipe(
      entries(schema),
      asyncMap(async ([keyword, keywordSchema]) => {
        const keywordHandler = getKeywordByName(keyword, schema.document.dialectId);
        const keywordAst = await keywordHandler.compile(keywordSchema, ast, schema);
        return [keywordHandler.id, pointerAppend(keyword, canonicalUri(schema)), keywordAst];
      }),
      asyncCollectArray
    );
  }

  return url;
};

const interpret = (url, instance, context) => {
  context.dynamicAnchors = {
    ...context.ast.metaData[toAbsoluteUri(url)].dynamicAnchors,
    ...context.dynamicAnchors
  };

  let valid = true;

  for (const plugin of context.plugins) {
    plugin.beforeSchema(context);
  }

  if (typeof context.ast[url] === "boolean") {
    valid = context.ast[url];
  } else {
    for (const node of context.ast[url]) {
      const [keywordId, , keywordValue] = node;
      const keyword = getKeyword(keywordId);

      const keywordContext = {
        ast: context.ast,
        plugins: context.plugins,
        dynamicAnchors: context.dynamicAnchors
      };
      for (const plugin of context.plugins) {
        plugin.beforeKeyword(keywordContext, context);
      }
      const isKeywordValid = keyword.interpret(keywordValue, instance, keywordContext);
      if (!isKeywordValid) {
        valid = false;
      }

      for (const plugin of context.plugins) {
        plugin.afterKeyword(node, instance, isKeywordValid, keywordContext, context, keyword);
      }
    }
  }

  for (const plugin of context.plugins) {
    plugin.afterSchema(url, instance, valid, context);
  }
  return valid;
};

const emptyPropertyNames = new Set();
const collectEvaluatedProperties = (url, instance, context, isTop = false) => {
  if (typeof context.ast[url] === "boolean") {
    return context.ast[url] ? emptyPropertyNames : false;
  }

  const accumulatedPropertyNames = new Set();
  for (const [keywordId, , keywordValue] of context.ast[url]) {
    if (isTop && keywordId === "https://json-schema.org/keyword/unevaluatedProperties") {
      continue;
    }

    const keywordHandler = getKeyword(keywordId);
    const propertyNames = "collectEvaluatedProperties" in keywordHandler
      ? keywordHandler.collectEvaluatedProperties(keywordValue, instance, context, isTop)
      : keywordHandler.interpret(keywordValue, instance, context) && emptyPropertyNames;

    if (propertyNames === false) {
      return false;
    }

    propertyNames.forEach(accumulatedPropertyNames.add, accumulatedPropertyNames);
  }

  return accumulatedPropertyNames;
};

const emptyItemIndexes = new Set();
const collectEvaluatedItems = (url, instance, context, isTop = false) => {
  if (typeof context.ast[url] === "boolean") {
    return context.ast[url] ? emptyItemIndexes : false;
  }

  const accumulatedItemIndexes = new Set();
  for (const [keywordId, , keywordValue] of context.ast[url]) {
    if (isTop && keywordId === "https://json-schema.org/keyword/unevaluatedItems") {
      continue;
    }

    const keywordHandler = getKeyword(keywordId);
    const itemIndexes = "collectEvaluatedItems" in keywordHandler
      ? keywordHandler.collectEvaluatedItems(keywordValue, instance, context, isTop)
      : keywordHandler.interpret(keywordValue, instance, context) && emptyItemIndexes;

    if (itemIndexes === false) {
      return false;
    }

    itemIndexes.forEach(accumulatedItemIndexes.add, accumulatedItemIndexes);
  }

  return accumulatedItemIndexes;
};

export default { id, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
