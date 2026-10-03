import { Validation } from "../experimental.js";
import * as Instance from "../instance.js";


export class BasicOutputPlugin {
  id = "https://json-schema.hyperjump.io/plugins/basic-output";
  #errors = [];
  #flattenedErrors;

  // Error lists are created when the first error is added rather than for every schema and keyword evaluated. A
  // failing keyword adds its subschemas' error list to the schema's list as a nested list instead of copying every
  // error up each level of the schema. They're flattened once when the errors are read.

  afterKeyword(node, instance, context, valid, schemaContext, keyword) {
    if (!valid) {
      schemaContext.errors ??= [];
      if (!keyword.simpleApplicator) {
        const [keywordId, schemaUri] = node;
        schemaContext.errors.push({
          keyword: keywordId,
          absoluteKeywordLocation: schemaUri,
          instanceLocation: Instance.uri(instance)
        });
      }
      if (context.errors !== undefined) {
        schemaContext.errors.push(context.errors);
      }
    }
  }

  afterSchema(url, instance, context, valid) {
    if (typeof context.ast[url] === "boolean" && !valid) {
      context.errors ??= [];
      context.errors.push({
        keyword: Validation.id,
        absoluteKeywordLocation: url,
        instanceLocation: Instance.uri(instance)
      });
    }

    this.#errors = context.errors ?? [];
    this.#flattenedErrors = undefined;
  }

  get errors() {
    this.#flattenedErrors ??= flatten(this.#errors, []);
    return this.#flattenedErrors;
  }
}

const flatten = (errors, result) => {
  for (const error of errors) {
    if (Array.isArray(error)) {
      flatten(error, result);
    } else {
      result.push(error);
    }
  }

  return result;
};
