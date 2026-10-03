import * as Instance from "../instance.js";


export class AnnotationsPlugin {
  id = "https://json-schema.hyperjump.io/plugins/annotations";
  #annotations = [];
  #flattenedAnnotations;

  // Annotation lists are created when the first annotation is added rather than for every schema and keyword
  // evaluated. A passing keyword or schema adds its subschemas' annotation list as a nested list instead of copying
  // every annotation up each level of the schema. They're flattened once when the annotations are read.

  beforeSchema(_url, _instance, context) {
    context.schemaAnnotations = undefined;
  }

  afterKeyword(node, instance, context, valid, schemaContext, keyword) {
    if (valid) {
      const [keywordId, schemaUri, keywordValue] = node;
      const annotation = keyword.annotation?.(keywordValue, instance, context);
      if (annotation !== undefined) {
        schemaContext.schemaAnnotations ??= [];
        schemaContext.schemaAnnotations.push({
          keyword: keywordId,
          absoluteKeywordLocation: schemaUri,
          instanceLocation: Instance.uri(instance),
          annotation: annotation
        });
      }
      if (context.annotations !== undefined) {
        schemaContext.schemaAnnotations ??= [];
        schemaContext.schemaAnnotations.push(context.annotations);
      }
    }
  }

  afterSchema(_schemaNode, _instanceNode, context, valid) {
    if (valid && context.schemaAnnotations !== undefined) {
      context.annotations ??= [];
      context.annotations.push(context.schemaAnnotations);
    }

    this.#annotations = context.annotations ?? [];
    this.#flattenedAnnotations = undefined;
  }

  get annotations() {
    this.#flattenedAnnotations ??= flatten(this.#annotations, []);
    return this.#flattenedAnnotations;
  }
}

const flatten = (annotations, result) => {
  for (const annotation of annotations) {
    if (Array.isArray(annotation)) {
      flatten(annotation, result);
    } else {
      result.push(annotation);
    }
  }

  return result;
};
