import { DetailedValidationError } from "./validation-error.js";
import { falseSchemaRuleId, inDocumentOrder, keywordErrors, keywordName } from "./utilities.js";

/**
 * @import { EvaluationPlugin } from "../evaluate/evaluation-plugin.d.ts"
 * @import { OutputFormatDefinition } from "./output-format.d.ts"
 * @import { KeywordErrors } from "./utilities.js"
 */

/**
 * Collects errors nested by schema structure. A failing keyword's error
 * contains its failing subschemas' errors.
 *
 * @implements EvaluationPlugin<DetailedValidationError[], KeywordErrors<DetailedValidationError>>
 */
export class DetailedOutputPlugin {
  /** @type DetailedValidationError[] */
  errors = [];

  beforeSchema() {
    return [];
  }

  /** @type NonNullable<EvaluationPlugin<DetailedValidationError[], KeywordErrors<DetailedValidationError>>["beforeKeyword"]> */
  beforeKeyword(keyword) {
    return keywordErrors(keyword);
  }

  /** @type NonNullable<EvaluationPlugin<DetailedValidationError[], KeywordErrors<DetailedValidationError>>["afterKeyword"]> */
  afterKeyword(keyword, at, valid, state, schema) {
    if (!valid) {
      const error = new DetailedValidationError(`Expected the instance to pass '${keywordName(keyword.absoluteKeywordLocation)}'`, {
        ruleId: keyword.keywordUri,
        keywordLocation: at.keywordLocation,
        absoluteKeywordLocation: keyword.absoluteKeywordLocation,
        instanceLocation: at.instanceLocation,
        place: at.node?.position
      });
      if (state.length > 0) {
        error.errors = state;
      }
      schema.push(error);
    }
  }

  /** @type NonNullable<EvaluationPlugin<DetailedValidationError[], KeywordErrors<DetailedValidationError>>["afterSchema"]> */
  afterSchema(schema, at, valid, state, parent) {
    if (!valid && schema.booleanSchema === false) {
      state.push(new DetailedValidationError("The 'false' schema doesn't allow any value", {
        ruleId: falseSchemaRuleId,
        keywordLocation: at.keywordLocation,
        absoluteKeywordLocation: schema.absoluteKeywordLocation,
        instanceLocation: at.instanceLocation,
        place: at.node?.position
      }));
    }

    if (parent === undefined) {
      this.errors = valid ? [] : state;
    } else if (!valid && !parent.conditions?.has(schema.absoluteKeywordLocation)) {
      parent.push(...state);
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
