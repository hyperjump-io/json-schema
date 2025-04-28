import { Validation } from "../experimental.js";
import * as Instance from "../instance.js";


export const detailedOutputPlugin = {
  beforeSchema(schemaContext) {
    schemaContext.errors ??= [];
  },
  beforeKeyword(keywordContext) {
    keywordContext.errors = [];
  },
  afterKeyword(node, instance, valid, keywordContext, schemaContext) {
    if (!valid) {
      const [keywordId, schemaUri] = node;
      const outputUnit = {
        keyword: keywordId,
        absoluteKeywordLocation: schemaUri,
        instanceLocation: Instance.uri(instance)
      };

      schemaContext.errors.push(outputUnit);
      if (keywordContext.errors.length > 0) {
        outputUnit.errors = keywordContext.errors;
      }
    }
  },
  afterSchema(url, instance, valid, schemaContext) {
    if (typeof schemaContext.ast[url] === "boolean" && !valid) {
      schemaContext.errors.push({
        keyword: Validation.id,
        absoluteKeywordLocation: url,
        instanceLocation: Instance.uri(instance)
      });
    }
  }
};
