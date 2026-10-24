import { falseSchemaRuleId, inDocumentOrder, isCondition, keywordStart, startOf, validationError } from "./utilities.js";

/**
 * @import { EvaluationPlugin } from "../kernel/evaluation-plugin.d.ts"
 * @import { OutputFormatDefinition } from "./output-format.d.ts"
 * @import { DetailedValidationError } from "./validation-error.d.ts"
 * @import { KeywordStart } from "./utilities.js"
 */

/**
 * Collects errors nested by schema structure.
 *
 * The errors are in one list for the whole evaluation. A schema's or
 * keyword's state is where its errors start in the list, so collecting
 * doesn't allocate anything until something fails. When a schema or keyword
 * passes, the errors its subschemas added are dropped by cutting the list
 * back to where it started.
 *
 * @implements EvaluationPlugin<number, KeywordStart>
 */
export class DetailedOutputPlugin {
  /** @type DetailedValidationError[] */
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
    } else {
      // A failing keyword's error takes its subschemas' errors
      /** @type DetailedValidationError */
      const error = validationError(keyword.keywordUri, keyword.absoluteKeywordLocation, at);
      if (start < this.errors.length) {
        error.errors = this.errors.splice(start);
      }
      this.errors.push(error);
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

/** @type OutputFormatDefinition<"DETAILED"> */
export const detailedOutputFormat = () => {
  const plugin = new DetailedOutputPlugin();
  return {
    plugin,
    output: (valid, syntaxErrors) => ({ valid, errors: inDocumentOrder([...syntaxErrors, ...plugin.errors]) })
  };
};
