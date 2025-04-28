import * as Instance from "../instance.js";


export const annotationsPlugin = {
  beforeSchema(context) {
    context.annotations ??= [];
    context.schemaAnnotations = [];
  },
  beforeKeyword(context) {
    context.annotations = [];
  },
  afterKeyword(node, instance, valid, keywordContext, schemaContext, keyword) {
    if (valid) {
      const [keywordId, schemaUri, keywordValue] = node;
      const annotation = keyword.annotation?.(keywordValue, instance, keywordContext);
      if (annotation !== undefined) {
        schemaContext.schemaAnnotations.push({
          keyword: keywordId,
          absoluteKeywordLocation: schemaUri,
          instanceLocation: Instance.uri(instance),
          annotation: annotation
        });
      }
      schemaContext.schemaAnnotations.push(...keywordContext.annotations);
    }
  },
  afterSchema(_schemaNode, _instanceNode, valid, context) {
    if (valid) {
      context.annotations.push(...context.schemaAnnotations);
    }
  }
};
