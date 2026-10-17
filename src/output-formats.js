import { DetailedValidationError, ValidationError } from "./validation-error.js";

/**
 * @import { EvaluationLocation, EvaluationPlugin, KeywordInfo, SchemaInfo } from "./evaluation-plugin.d.ts"
 * @import { JsonSyntaxError, OutputError, OutputFormatDefinition } from "./json-schema.d.ts"
 */

/** The `ruleId` of an error from a `false` schema */
export const falseSchemaRuleId = "https://json-schema.org/validation";

/**
 * Collects a flat list of errors. A failing keyword's state collects the
 * errors of its subschemas, which are only kept if the keyword fails.
 *
 * @implements EvaluationPlugin<ValidationError[], ValidationError[]>
 */
export class BasicOutputPlugin {
  /** @type ValidationError[] */
  errors = [];

  beforeSchema() {
    return [];
  }

  beforeKeyword() {
    return [];
  }

  /** @type NonNullable<EvaluationPlugin<ValidationError[], ValidationError[]>["afterKeyword"]> */
  afterKeyword(keyword, at, valid, state, schema) {
    if (!valid) {
      if (!keyword.keyword.simpleApplicator) {
        schema.push(keywordError(ValidationError, keyword, at));
      }
      schema.push(...state);
    }
  }

  /** @type NonNullable<EvaluationPlugin<ValidationError[], ValidationError[]>["afterSchema"]> */
  afterSchema(schema, at, valid, state, parent) {
    if (!valid && schema.booleanSchema === false) {
      state.push(falseSchemaError(ValidationError, schema, at));
    }

    if (parent === undefined) {
      this.errors = valid ? [] : state;
    } else if (!valid) {
      parent.push(...state);
    }
  }
}

/**
 * Collects errors nested by schema structure. A failing keyword's error
 * contains its failing subschemas' errors.
 *
 * @implements EvaluationPlugin<DetailedValidationError[], DetailedValidationError[]>
 */
export class DetailedOutputPlugin {
  /** @type DetailedValidationError[] */
  errors = [];

  beforeSchema() {
    return [];
  }

  beforeKeyword() {
    return [];
  }

  /** @type NonNullable<EvaluationPlugin<DetailedValidationError[], DetailedValidationError[]>["afterKeyword"]> */
  afterKeyword(keyword, at, valid, state, schema) {
    if (!valid) {
      const error = keywordError(DetailedValidationError, keyword, at);
      if (state.length > 0) {
        error.errors = state;
      }
      schema.push(error);
    }
  }

  /** @type NonNullable<EvaluationPlugin<DetailedValidationError[], DetailedValidationError[]>["afterSchema"]> */
  afterSchema(schema, at, valid, state, parent) {
    if (!valid && schema.booleanSchema === false) {
      state.push(falseSchemaError(DetailedValidationError, schema, at));
    }

    if (parent === undefined) {
      this.errors = valid ? [] : state;
    } else if (!valid) {
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

/** @type OutputFormatDefinition<"DETAILED"> */
export const detailedOutputFormat = () => {
  const plugin = new DetailedOutputPlugin();
  return {
    plugin,
    output: (valid, syntaxErrors) => ({ valid, errors: inDocumentOrder([...syntaxErrors, ...plugin.errors]) })
  };
};

/** @type <E extends ValidationError>(ErrorClass: new (...args: ConstructorParameters<typeof ValidationError>) => E, keyword: KeywordInfo, at: EvaluationLocation) => E */
const keywordError = (ErrorClass, keyword, at) => {
  return new ErrorClass(`Expected the instance to pass '${keywordName(keyword.absoluteKeywordLocation)}'`, {
    ruleId: keyword.keywordUri,
    keywordLocation: at.keywordLocation,
    absoluteKeywordLocation: keyword.absoluteKeywordLocation,
    instanceLocation: at.instanceLocation,
    place: at.node?.position
  });
};

/** @type <E extends ValidationError>(ErrorClass: new (...args: ConstructorParameters<typeof ValidationError>) => E, schema: SchemaInfo, at: EvaluationLocation) => E */
const falseSchemaError = (ErrorClass, schema, at) => {
  return new ErrorClass("The 'false' schema doesn't allow any value", {
    ruleId: falseSchemaRuleId,
    keywordLocation: at.keywordLocation,
    absoluteKeywordLocation: schema.absoluteKeywordLocation,
    instanceLocation: at.instanceLocation,
    place: at.node?.position
  });
};

/**
 * The last segment of a keyword's location is its name
 *
 * @type (location: string) => string
 */
const keywordName = (location) => {
  const segment = location.slice(location.lastIndexOf("/") + 1);
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
};

/**
 * Errors with positions are sorted by where they start. Errors without
 * positions (from a JS value) keep the order they were found in.
 *
 * @type <E extends OutputError>(errors: (E | JsonSyntaxError)[]) => (E | JsonSyntaxError)[]
 */
const inDocumentOrder = (errors) => {
  return errors.sort((a, b) => offset(a) - offset(b));
};

/** @type (error: OutputError) => number */
const offset = (error) => {
  const place = error.place;
  const point = place && "start" in place ? place.start : place;
  return point?.offset ?? 0;
};
