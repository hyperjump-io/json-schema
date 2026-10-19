import { ValidationError } from "./validation-error.js";
import { falseSchemaRuleId, inDocumentOrder, keywordErrors, keywordName } from "./utilities.js";

/**
 * @import { EvaluationPlugin } from "../evaluate/evaluation-plugin.d.ts"
 * @import { OutputFormatDefinition } from "./output-format.d.ts"
 * @import { KeywordErrors } from "./utilities.js"
 */

/**
 * Collects a flat list of errors. A failing keyword's state collects the
 * errors of its subschemas, which are only kept if the keyword fails.
 *
 * @implements EvaluationPlugin<ValidationError[], KeywordErrors<ValidationError>>
 */
export class BasicOutputPlugin {
  /** @type ValidationError[] */
  errors = [];

  beforeSchema() {
    return [];
  }

  /** @type NonNullable<EvaluationPlugin<ValidationError[], KeywordErrors<ValidationError>>["beforeKeyword"]> */
  beforeKeyword(keyword) {
    return keywordErrors(keyword);
  }

  /** @type NonNullable<EvaluationPlugin<ValidationError[], KeywordErrors<ValidationError>>["afterKeyword"]> */
  afterKeyword(keyword, at, valid, state, schema) {
    if (!valid) {
      if (!keyword.keyword.simpleApplicator) {
        schema.push(new ValidationError(`Expected the instance to pass '${keywordName(keyword.absoluteKeywordLocation)}'`, {
          ruleId: keyword.keywordUri,
          keywordLocation: at.keywordLocation,
          absoluteKeywordLocation: keyword.absoluteKeywordLocation,
          instanceLocation: at.instanceLocation,
          place: at.node?.position
        }));
      }
      schema.push(...state);
    }
  }

  /** @type NonNullable<EvaluationPlugin<ValidationError[], KeywordErrors<ValidationError>>["afterSchema"]> */
  afterSchema(schema, at, valid, state, parent) {
    if (!valid && schema.booleanSchema === false) {
      state.push(new ValidationError("The 'false' schema doesn't allow any value", {
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

/** @type OutputFormatDefinition<"BASIC"> */
export const basicOutputFormat = () => {
  const plugin = new BasicOutputPlugin();
  return {
    plugin,
    output: (valid, syntaxErrors) => ({ valid, errors: inDocumentOrder([...syntaxErrors, ...plugin.errors]) })
  };
};
