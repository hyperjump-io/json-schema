import { Validation } from "../experimental.js";
import * as Instance from "../instance.js";


export const basicOutputPlugin = {
  beforeSchema(schemaContext) {
    schemaContext.errors ??= [];
  },
  beforeKeyword(keywordContext) {
    keywordContext.errors = [];
  },
  afterKeyword(node, instance, valid, keywordContext, schemaContext, keyword) {
    if (!valid) {
      if (!keyword.simpleApplicator) {
        const [keywordId, schemaUri] = node;
        schemaContext.errors.push({
          keyword: keywordId,
          absoluteKeywordLocation: schemaUri,
          instanceLocation: Instance.uri(instance)
        });
      }
      schemaContext.errors.push(...keywordContext.errors);
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
