import { falseSchemaRuleId, inDocumentOrder, isCondition, keywordStart, startOf, validationError } from "./utilities.js";

/**
 * @import { EvaluationPlugin } from "../kernel/evaluation-plugin.d.ts"
 * @import { OutputFormatDefinition } from "./output-format.d.ts"
 * @import { ValidationError } from "./validation-error.d.ts"
 * @import { KeywordStart } from "./utilities.js"
 */

/**
 * Collects a flat list of errors.
 *
 * The errors are in one list for the whole evaluation. A schema's or
 * keyword's state is where its errors start in the list, so collecting
 * doesn't allocate anything until something fails. When a schema or keyword
 * passes, the errors its subschemas added are dropped by cutting the list
 * back to where it started.
 *
 * @implements EvaluationPlugin<number, KeywordStart>
 */
export class BasicOutputPlugin {
  /** @type ValidationError[] */
  errors = [];

  /** @type NonNullable<EvaluationPlugin<number, KeywordStart>["beforeSchema"]> */
  beforeSchema(_schema, _at, parent) {
    if (parent === undefined) {
      this.errors = [];
    }

    return this.errors.length;
  }

  /** @type NonNullable<EvaluationPlugin<number, KeywordStart>["beforeKeyword"]> */
  beforeKeyword(keyword) {
    return keywordStart(keyword, this.errors.length);
  }

  /** @type NonNullable<EvaluationPlugin<number, KeywordStart>["afterKeyword"]> */
  afterKeyword(keyword, at, valid, state) {
    const start = startOf(state);
    if (valid) {
      this.#dropFrom(start);
    } else if (!keyword.explainsFailure) {
      // A failing keyword's error comes before its subschemas' errors
      const error = validationError(keyword.keywordUri, keyword.absoluteKeywordLocation, at);
      if (start === this.errors.length) {
        this.errors.push(error);
      } else {
        this.errors.splice(start, 0, error);
      }
    }
  }

  /** @type NonNullable<EvaluationPlugin<number, KeywordStart>["afterSchema"]> */
  afterSchema(schema, at, valid, start, parent) {
    if (valid || isCondition(schema.absoluteKeywordLocation, parent)) {
      this.#dropFrom(start);
    } else if (schema.booleanSchema === false) {
      this.errors.push(validationError(falseSchemaRuleId, schema.absoluteKeywordLocation, at));
    }
  }

  /**
   * Drop the errors after `start`. Setting an array's length is slow even
   * when it doesn't change, and usually nothing failed.
   *
   * @param {number} start
   */
  #dropFrom(start) {
    if (this.errors.length > start) {
      this.errors.length = start;
    }
  }
}

/** @type OutputFormatDefinition<"BASIC"> */
export const basicOutputFormat = () => {
  const plugin = new BasicOutputPlugin();
  return {
    plugin,
    output: (valid, syntaxErrors) => ({ valid, errors: inDocumentOrder([...syntaxErrors, ...plugin.errors]) })
  };
};
